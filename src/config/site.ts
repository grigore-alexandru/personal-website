// Site-wide constants and the primitives every generateMetadata depends on.
// Nothing here reaches for the database or the request — it is pure, so it is
// safe to import from Server Components, Route Handlers and the sitemap alike.

// Type-only import: erased at compile time, so this file stays dependency-free.
import type { PageCardKey } from './pageCards';

export const SITE_NAME = 'Alexandru Grigore';
export const SITE_URL = 'https://alexandrugrigore.com';

/** Content is Romanian. Drives <html lang>, og:locale and schema inLanguage. */
export const SITE_LANG = 'ro';
export const SITE_LOCALE = 'ro_RO';
export const SITE_IN_LANGUAGE = 'ro-RO';

export const SITE_DESCRIPTION =
  'Video director and creative producer. Commercials, documentaries, and branded content.';

/** Real 1200x630 JPEG in /public — regenerate with scripts/generate-brand-assets.py. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

/**
 * Bump when the card design in src/app/og/card/[card]/route.tsx changes.
 *
 * Facebook and WhatsApp cache an og:image by URL, effectively forever. Without a
 * new URL a redesigned card would never reach anyone who has shared the page
 * before; with one, the next scrape fetches the new image.
 */
export const OG_CARD_VERSION = 1;

/** The build-time share card for a page with no image of its own. */
export function pageCardUrl(card: PageCardKey): string {
  return `${SITE_URL}/og/card/${card}?v=${OG_CARD_VERSION}`;
}

/** Stable @id for the Person node every JSON-LD graph on the site points at. */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * Rewrites any image URL through this site's own transformer (src/app/og) so
 * the crawler is handed a JPEG of exactly 1200x630.
 *
 * This one indirection fixes three separate problems at once:
 *   - content posters are capped at 480px wide at upload time, which is below
 *     the minimum Facebook, LinkedIn and WhatsApp will render as a large card;
 *   - every stored derivative is WebP, which WhatsApp handles unreliably;
 *   - `og:image:width/height` were hardcoded to 1200x630 on images that were
 *     never that size, so the declaration lied to the scraper.
 *
 * This used to be Netlify's Image CDN (`/.netlify/images?...&fit=cover&fm=jpg`).
 * Vercel's optimizer is NOT a drop-in replacement — `/_vercel/image` takes only
 * `url`, `w` and `q`, so it can neither crop to a fixed aspect ratio nor force
 * JPEG. `/og` exists to do exactly what the Netlify transform did; the shape of
 * the query string is deliberately the same so the two are easy to compare.
 *
 * Remote hosts must be listed in image-hosts.json, which is also what
 * next.config.js and scripts/check-metadata.mjs read.
 *
 * `card` names the section to fall back to when there is no image — a blog
 * post with no hero gets the "Blog" card rather than the generic one.
 */
export function ogImage(src?: string | null, card?: PageCardKey): string {
  // No image of our own: the page's section card ("Blog", "Projects"...) says
  // far more about the link than the site-wide generic card does.
  if (!src || src.startsWith('data:')) return card ? pageCardUrl(card) : DEFAULT_OG_IMAGE;

  const absolute = src.startsWith('http') ? src : `${SITE_URL}${src}`;

  // Already one of ours — a transform, or a build-time page card. Both are
  // 1200x630 JPEG already; re-wrapping would only double-encode the URL.
  if (absolute.startsWith(`${SITE_URL}/og?`) || absolute.startsWith(`${SITE_URL}/og/`)) {
    return absolute;
  }

  // `w`, `h`, `fit`, `position`, `fm` and `q` are fixed by the route itself and
  // are not accepted as parameters: a card is 1200x630 JPEG or it is a bug.
  return `${SITE_URL}/og?url=${encodeURIComponent(absolute)}`;
}

/**
 * Turns raw database text into something a social card can show: collapses the
 * newlines that were ending up inside `content="..."`, then cuts on a word
 * boundary instead of mid-word.
 */
export function metaDescription(
  raw: string | null | undefined,
  fallback: string = SITE_DESCRIPTION,
  max = 155
): string {
  const clean = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return fallback;
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const trimmed = (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(
    /[\s,;:.–—-]+$/,
    ''
  );

  return `${trimmed}…`;
}

/** Characters left for a page title once " | Alexandru Grigore" is appended and
 *  the whole thing has to fit the ~60 platforms and Google display. */
const TITLE_BUDGET = 60 - ` | ${SITE_NAME}`.length;

/**
 * Trims a page title to the budget. Used for the bare <title> value, which the
 * root layout's template then suffixes — so trimming here is what keeps the
 * rendered <title> under 60 characters too, not just og:title.
 */
export function pageTitle(title: string): string {
  const clean = title.trim().replace(/\s+/g, ' ');
  if (clean.length <= TITLE_BUDGET) return clean;

  const cut = clean.slice(0, TITLE_BUDGET - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > TITLE_BUDGET * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Builds the "<title> | Alexandru Grigore" string used for og:title and
 * twitter:title, keeping the whole thing inside the ~60 characters platforms
 * display before truncating.
 */
export function ogTitle(title: string): string {
  return `${pageTitle(title)} | ${SITE_NAME}`;
}
