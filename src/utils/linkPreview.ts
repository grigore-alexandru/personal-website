// Server-only by construction: it makes outbound fetches and reads the
// database. Nothing here is imported from a Client Component. (The `server-only`
// package would enforce that at build time, but it is not a dependency of this
// project and adding one for a single guard is not worth it.)
import { SITE_NAME, SITE_URL, ogImage, metaDescription } from '../config/site';
import { loadPost } from './blogLoader';
import { loadProject, extractTextFromTipTap } from './dataLoader';
import { loadContentBySlug } from './contentService';
import { getDocumentBySlug, withCacheBust } from './documentsService';

/**
 * Everything a short link needs in order to reproduce its destination's card.
 *
 * `image` is always a final, ready-to-emit absolute URL. Internal destinations
 * run theirs through ogImage() (Netlify Image CDN, 1200x630 JPEG); external
 * ones are passed through untouched, because the Image CDN only accepts hosts
 * allowlisted in netlify.toml and would 400 on a third-party domain.
 */
export interface LinkPreview {
  title: string;
  description: string;
  image: string | null;
  imageAlt: string | null;
  siteName: string | null;
  type: string;
  /** Canonical URL of the destination — becomes og:url on the short link. */
  url: string;
  /** Internal previews declare 1200x630; external ones cannot be trusted to. */
  hasKnownDimensions: boolean;
}

const OG_TYPES = new Set([
  'website',
  'article',
  'video.other',
  'video.movie',
  'video.episode',
  'profile',
  'music.song',
  'book',
]);

/* ------------------------------------------------------------------ *
 * Internal destinations — read the row, skip the HTTP hop entirely.
 * ------------------------------------------------------------------ */

function poster(thumbnail: unknown): string | null {
  return thumbnail && typeof thumbnail === 'object' && 'poster' in thumbnail
    ? ((thumbnail as { poster: string }).poster ?? null)
    : null;
}

/**
 * Builds the preview from the database rather than by scraping our own HTML.
 *
 * This is exact by construction — it reuses the same loaders and the same
 * ogImage()/metaDescription() helpers the destination page itself uses, so the
 * short link and the direct link can never drift apart. It also avoids a
 * server making an HTTP request to itself, which is both slow and a reliable
 * source of deadlocks during static generation.
 */
export async function internalPreview(target: URL): Promise<LinkPreview | null> {
  const segments = target.pathname.split('/').filter(Boolean);
  const base = { siteName: SITE_NAME, hasKnownDimensions: true };

  if (segments[0] === 'blog' && segments[1]) {
    const post = await loadPost(segments[1]);
    if (!post) return null;
    return {
      ...base,
      title: post.title,
      // Must be the SAME fallback chain as blog/[slug]/page.tsx — excerpt is
      // often empty and the page falls through to the body text. Diverging here
      // would make the short link show the generic site description while the
      // page itself showed the post.
      description: metaDescription(
        post.excerpt || extractTextFromTipTap(post.content) || `Blog post by ${SITE_NAME}`
      ),
      image: ogImage(post.heroImageLarge),
      imageAlt: post.title,
      type: 'article',
      url: `${SITE_URL}/blog/${post.slug}`,
    };
  }

  if (segments[0] === 'portfolio' && segments[1] === 'projects' && segments[2]) {
    const project = await loadProject(segments[2]);
    if (!project) return null;
    return {
      ...base,
      title: project.title,
      description: metaDescription(
        `${project.project_type.name} project for ${project.client_name}.`
      ),
      image: ogImage(project.hero_image_large),
      imageAlt: project.title,
      type: 'article',
      url: `${SITE_URL}/portfolio/projects/${project.slug}`,
    };
  }

  if (segments[0] === 'portfolio' && segments[1] === 'content' && segments[2]) {
    const content = await loadContentBySlug(segments[2]);
    if (!content) return null;
    const isVideo = content.content_type?.slug === 'video';
    return {
      ...base,
      title: content.title,
      description: metaDescription(
        content.caption ?? `${isVideo ? 'Video' : 'Image'} by ${SITE_NAME}`
      ),
      image: ogImage(poster(content.thumbnail)),
      imageAlt: content.title,
      type: isVideo ? 'video.other' : 'website',
      url: `${SITE_URL}/portfolio/content/${content.slug}`,
    };
  }

  if (segments[0] === 'documents' && segments[1]) {
    const doc = await getDocumentBySlug(segments[1]);
    if (!doc) return null;
    return {
      ...base,
      title: doc.title,
      description: metaDescription(doc.description || `${doc.title} — a document from ${SITE_NAME}`),
      image: ogImage(doc.thumbnailUrl ? withCacheBust(doc.thumbnailUrl, doc.updatedAt) : null),
      imageAlt: doc.title,
      type: 'article',
      url: `${SITE_URL}/documents/${doc.slug}`,
    };
  }

  // A route with no per-row metadata (/, /contact, /blog...). The site-level
  // defaults are a truthful card for these, so let the caller fall back.
  return null;
}

/* ------------------------------------------------------------------ *
 * External destinations — scrape the head, carefully.
 * ------------------------------------------------------------------ */

/** OG tags always live in <head>. Never read further than this. */
const MAX_HEAD_BYTES = 256 * 1024;
/** Shorter than any scraper's own patience, so we fail before they do. */
const TIMEOUT_MS = 4000;

/*
 * Entity decoding. Node has no built-in HTML entity decoder, and titles and
 * descriptions in the wild are full of &mdash;, &rsquo; and accented Latin-1 —
 * leaving them raw would put literal "&mdash;" in the card.
 *
 * The named references for U+00A0–U+00FF are a fixed, ordered list, so that
 * whole block is generated rather than typed out; the rest is the punctuation
 * and symbols that actually turn up in page titles.
 */
const LATIN1_NAMES =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr ' +
  'deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 ' +
  'frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute ' +
  'Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml ' +
  'times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc ' +
  'atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml ' +
  'eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc ' +
  'uuml yacute thorn yuml';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  bull: '•',
  hellip: '…',
  dagger: '†',
  Dagger: '‡',
  permil: '‰',
  lsaquo: '‹',
  rsaquo: '›',
  trade: '™',
  euro: '€',
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
};

LATIN1_NAMES.split(' ').forEach((name, index) => {
  // U+00A0 is nbsp; a non-breaking space is collapsed to a normal one later.
  ENTITIES[name] = String.fromCodePoint(0xa0 + index);
});

function decodeEntities(value: string): string {
  return value.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, ref: string) => {
    if (ref[0] === '#') {
      const hex = ref[1] === 'x' || ref[1] === 'X';
      const code = parseInt(hex ? ref.slice(2) : ref.slice(1), hex ? 16 : 10);
      // Reject unpaired surrogates and out-of-range values outright.
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return match;
      if (code >= 0xd800 && code <= 0xdfff) return match;
      return String.fromCodePoint(code);
    }

    // Named references are case-sensitive: &Eacute; and &eacute; differ.
    return ENTITIES[ref] ?? match;
  });
}

/**
 * Reads at most `limit` bytes, stopping early at </head>.
 *
 * Streaming rather than res.text() matters: a destination could be a 50MB HTML
 * document, or a slow trickle designed to hold the connection open. Neither
 * should be able to stall a preview.
 */
async function readCapped(response: Response, limit: number): Promise<string> {
  const body = response.body;
  if (!body) return '';

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let html = '';
  let bytes = 0;

  try {
    while (bytes < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>')) break;
    }
  } finally {
    // Releases the connection instead of waiting for the rest of the body.
    await reader.cancel().catch(() => {});
  }

  return html;
}

/** All <meta> tags, keyed by their property/name attribute (first wins). */
function parseMetaTags(html: string): Map<string, string> {
  const head = html.split('</head>')[0];
  const tags = new Map<string, string>();

  for (const match of head.matchAll(/<meta\s+([^>]*?)\/?>/gi)) {
    const attrs = match[1];
    // Attribute order varies between sites, so pull each one independently.
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1];
    if (key && content !== undefined && !tags.has(key.toLowerCase())) {
      tags.set(key.toLowerCase(), decodeEntities(content).replace(/\s+/g, ' ').trim());
    }
  }

  return tags;
}

function parseHead(html: string, finalUrl: string): LinkPreview | null {
  const tags = parseMetaTags(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  const title =
    tags.get('og:title') ||
    tags.get('twitter:title') ||
    (titleTag ? decodeEntities(titleTag).replace(/\s+/g, ' ').trim() : '');

  // No title at all means we did not get a real HTML document — better to fall
  // back to the plain redirect than to publish an empty card.
  if (!title) return null;

  const description =
    tags.get('og:description') || tags.get('twitter:description') || tags.get('description') || '';

  const rawImage = tags.get('og:image') || tags.get('og:image:url') || tags.get('twitter:image');

  let image: string | null = null;
  if (rawImage) {
    try {
      // Resolved against the FINAL url, so a site that redirected still gets
      // its relative image paths right.
      image = new URL(rawImage, finalUrl).toString();
    } catch {
      image = null;
    }
  }

  const declaredType = tags.get('og:type');
  const canonical = tags.get('og:url');

  let url = finalUrl;
  if (canonical) {
    try {
      url = new URL(canonical, finalUrl).toString();
    } catch {
      /* keep finalUrl */
    }
  }

  return {
    title,
    description,
    image,
    imageAlt: tags.get('og:image:alt') || tags.get('twitter:image:alt') || null,
    siteName: tags.get('og:site_name') || null,
    type: declaredType && OG_TYPES.has(declaredType) ? declaredType : 'website',
    url,
    hasKnownDimensions: false,
  };
}

export async function externalPreview(target: URL): Promise<LinkPreview | null> {
  if (target.protocol !== 'https:' && target.protocol !== 'http:') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Identify as a browser-like preview bot: plenty of sites serve a
        // stripped page, or none at all, to agents they do not recognise.
        'user-agent':
          'Mozilla/5.0 (compatible; AlexandruGrigoreLinkPreview/1.0; +https://alexandrugrigore.com)',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'ro,en;q=0.8',
      },
      // A short link that goes viral must not re-scrape its destination on
      // every single crawler hit.
      next: { revalidate: 3600 },
    });

    if (!response.ok) return null;
    if (!(response.headers.get('content-type') ?? '').includes('html')) return null;

    return parseHead(await readCapped(response, MAX_HEAD_BYTES), response.url);
  } catch {
    // Timeout, DNS failure, TLS error, aborted read — the caller falls back to
    // the ordinary redirect, which still lands on the destination's own card.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves a destination to its card, whichever side of the domain it is on. */
export async function resolvePreview(destination: string): Promise<LinkPreview | null> {
  let target: URL;
  try {
    target = new URL(destination);
  } catch {
    return null;
  }

  return target.origin === SITE_URL
    ? internalPreview(target)
    : externalPreview(target);
}
