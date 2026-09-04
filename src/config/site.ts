// Site-wide constants and the primitives every generateMetadata depends on.
// Nothing here reaches for the database or the request — it is pure, so it is
// safe to import from Server Components, Route Handlers and the sitemap alike.

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

/** Stable @id for the Person node every JSON-LD graph on the site points at. */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * Rewrites any image URL through Netlify's Image CDN so the crawler is handed a
 * JPEG of exactly 1200x630.
 *
 * This one indirection fixes three separate problems at once:
 *   - content posters are capped at 480px wide at upload time, which is below
 *     the minimum Facebook, LinkedIn and WhatsApp will render as a large card;
 *   - every stored derivative is WebP, which WhatsApp handles unreliably;
 *   - `og:image:width/height` were hardcoded to 1200x630 on images that were
 *     never that size, so the declaration lied to the scraper.
 *
 * Remote hosts must be allowlisted under `[images]` in netlify.toml.
 */
export function ogImage(src?: string | null): string {
  if (!src || src.startsWith('data:')) return DEFAULT_OG_IMAGE;

  const absolute = src.startsWith('http') ? src : `${SITE_URL}${src}`;

  // Already a Netlify transform (e.g. the default card being passed back
  // through) — re-wrapping it would double-encode the nested `url` param.
  if (absolute.includes('/.netlify/images?')) return absolute;

  const params = new URLSearchParams({
    url: absolute,
    w: '1200',
    h: '630',
    fit: 'cover',
    position: 'center',
    fm: 'jpg',
    q: '75',
  });

  return `${SITE_URL}/.netlify/images?${params.toString()}`;
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
