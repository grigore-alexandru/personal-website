import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import ALLOWED_HOSTS from '../../../image-hosts.json';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../../config/site';

/**
 * The og:image transformer. Replaces Netlify's Image CDN (`/.netlify/images`),
 * which this project relied on until the move to Vercel.
 *
 * Vercel's own optimizer (`/_vercel/image`) CANNOT stand in for it. It accepts
 * exactly three parameters — `url`, `w`, `q` — so it cannot:
 *   - crop to a fixed 1200x630 (it only scales by width, preserving aspect);
 *   - force JPEG (it negotiates WebP/AVIF from the `Accept` header, and falls
 *     back to the *source* format otherwise — so a WebP poster stays WebP).
 *
 * Both of those are load-bearing. See `ogImage()` in src/config/site.ts for the
 * three production defects that indirection exists to prevent; serving an
 * uncropped WebP would reintroduce all of them, and would additionally make the
 * hardcoded `og:image:width/height` of 1200x630 in src/lib/seo.ts a lie again.
 *
 * Node runtime, not edge: sharp is a native binding. It is on Next's default
 * `server-external-packages` list, so it is never bundled by webpack.
 *
 * Deliberately `/og` and NOT `/api/og`: robots.ts disallows `/api/` for every
 * user agent, and Facebook's and Meta's scrapers apply robots.txt to the
 * og:image fetch as well as to the page. Putting the transformer under /api/
 * would have produced blank cards with a perfectly correct <meta> tag — the
 * same invisible failure mode as the `/r/` disallow this project already hit
 * once. See the comment in src/app/robots.ts.
 */
export const runtime = 'nodejs';

/** Exactly what every platform wants for a large summary card. */
const WIDTH = 1200;
const HEIGHT = 630;
const QUALITY = 75;

/** Refuse to stream something enormous into memory for a 1200x630 crop. */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
/** Crawlers give up long before this; fail fast rather than hold them open. */
const FETCH_TIMEOUT_MS = 8000;

/**
 * Immutable: the URL fully determines the bytes. Every distinct source URL is
 * cached at the edge indefinitely, so a viral link costs exactly one transform.
 * `stale-while-revalidate` keeps a cold-but-present entry serving instantly.
 */
const CACHE_HEADER = 'public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400';

/**
 * Only our own hosts, plus the site itself for /og-default.jpg.
 *
 * This is an SSRF boundary, not a convenience: without it, `?url=` would turn
 * this route into an open proxy that fetches arbitrary URLs — including
 * `http://169.254.169.254/` and anything else reachable from inside the
 * function's network. Host matching is exact; no suffix matching, which would
 * let `evil-mega.io` through a naive `endsWith('mega.io')` check.
 */
function isAllowed(target: URL): boolean {
  if (target.protocol !== 'https:') return false;
  if (target.host === new URL(SITE_URL).host) return true;
  return (ALLOWED_HOSTS as string[]).includes(target.host);
}

/** The default card, served with the same headers so a failure still caches. */
async function fallback(): Promise<NextResponse> {
  const res = await fetch(DEFAULT_OG_IMAGE, { next: { revalidate: 86400 } });
  if (!res.ok) return new NextResponse('Image unavailable', { status: 502 });

  return new NextResponse(await res.arrayBuffer(), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': CACHE_HEADER },
  });
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) return new NextResponse('Missing url', { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse('Malformed url', { status: 400 });
  }

  // A disallowed host is a bug in a call site, not a visitor error. Returning
  // the default card rather than a 400 means a mistake degrades to a generic
  // preview instead of a broken one — the same failure mode Netlify had.
  if (!isAllowed(target)) return fallback();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const source = await fetch(target, {
      signal: controller.signal,
      headers: { accept: 'image/*' },
      // The source bytes rarely change; when they do, callers already append a
      // ?v=<updated_at> cache-bust (see withCacheBust in documentsService.ts).
      next: { revalidate: 86400 },
    });

    if (!source.ok) return fallback();

    const declared = Number(source.headers.get('content-length') ?? 0);
    if (declared > MAX_SOURCE_BYTES) return fallback();

    const buffer = Buffer.from(await source.arrayBuffer());
    if (buffer.byteLength > MAX_SOURCE_BYTES) return fallback();

    const output = await sharp(buffer, { animated: false })
      // `cover` + `centre` is the exact behaviour of the Netlify transform this
      // replaces (`fit=cover&position=center`) — fill the frame, crop the
      // overflow, never letterbox and never distort.
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre', withoutEnlargement: false })
      // `mozjpeg: true` implies progressive (it sets optimiseScans), which is
      // exactly what the Netlify transform emitted for two years — verified by
      // fetching the live /.netlify/images output side by side before the
      // cutover. Same 1200x630, same progressive JPEG, ~17% smaller, and sharp
      // drops the EXIF block Netlify kept, so camera GPS never reaches a card.
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    // `new Uint8Array(...)`, not the Buffer itself: Buffer is a Uint8Array at
    // runtime and works fine as a body, but its type does not satisfy BodyInit
    // under @types/node 20 + Next 14's lib.dom. The copy is free next to the
    // JPEG encode, and it side-steps Buffer's pooled-allocator byteOffset trap.
    return new NextResponse(new Uint8Array(output), {
      headers: {
        'content-type': 'image/jpeg',
        'content-length': String(output.byteLength),
        'cache-control': CACHE_HEADER,
        // Belt and braces: this route only ever emits a JPEG it just encoded,
        // but the header costs nothing and forecloses any sniffing surprise.
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (err) {
    // Timeout, DNS failure, TLS error, or a source sharp cannot decode (SVG
    // with no dimensions, corrupt upload). A generic card beats a broken one.
    console.error('[api/og] transform failed for', target.host, err);
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}
