import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { SITE_URL } from '../../config/site';
import type { PageCardIcon } from '../../config/pageCards';
import { ICONS } from './icons';

/**
 * Draws a 1200x630 share card.
 *
 * Shared by the two card routes so they cannot drift apart visually:
 *   - /og/card/[card]        one per section ("Blog", "Contact"...)
 *   - /og/item/[type]/[slug] one per post/project that has no image of its own
 *
 * Satori (next/og) rather than a canvas: it renders the lucide icons as real
 * SVG and embeds the fonts it is handed, so the output is byte-identical on a
 * laptop and on Vercel regardless of what fonts the machine has. Satori emits
 * PNG; it is re-encoded to JPEG to match every other og:image on the site (and
 * the `og:image:type` buildMetadata declares), because WhatsApp's handling of
 * anything but JPEG has been unreliable.
 */

export interface CardSpec {
  /** Small caps line above the title — the section, or the by-line. */
  eyebrow: string;
  title: string;
  description: string;
  icon: PageCardIcon;
  /** Printed after the domain in the footer. `null` prints the domain alone. */
  path: string | null;
}

const WIDTH = 1200;
const HEIGHT = 630;

/** src/styles/tokens.ts — the card uses the site's own palette. */
const COLOR = {
  ground: '#ffffff',
  ink: '#000000',
  body: '#525252', // neutral-600
  muted: '#a3a3a3', // neutral-400
  accent: '#2563eb', // primary-600
  wash: '#dbeafe', // primary-100
  sprocket: '#f0f0f0',
};

/**
 * The card is two zones that never overlap: text on the left in a fixed
 * column, the watermark icon on the right. Everything below is sized so the
 * longest title and description stay inside TEXT_WIDTH.
 */
const TEXT_LEFT = 96;
const TEXT_WIDTH = 600;
const MARK_SIZE = 340;

/** Beyond this a title cannot fit three lines, so it is cut on a word. */
const TITLE_MAX = 90;
const BODY_MAX = 130;

/** Poppins, vendored under src/assets/fonts (OFL) — the site's own face. Read
 *  from disk rather than fetched so a build never depends on the network.
 *  next.config.js traces these files into the item-card function, which (unlike
 *  the section cards) can also render on demand for a newly published post. */
const fonts = Promise.all(
  (['Regular', 'SemiBold'] as const).map((weight) =>
    readFile(join(process.cwd(), 'src/assets/fonts', `Poppins-${weight}.ttf`))
  )
);

function Icon({
  name,
  size,
  color,
  strokeWidth,
}: {
  name: PageCardIcon;
  size: number;
  color: string;
  strokeWidth: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name].map((shape, i) =>
        shape.tag === 'path' ? (
          <path key={i} d={shape.d} />
        ) : shape.tag === 'rect' ? (
          <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />
        ) : (
          <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />
        )
      )}
    </svg>
  );
}

/**
 * One ramp for both routes. Section names are short and get set large; a post
 * title is long and steps down until it fits the column in about three lines.
 */
function titleSize(title: string): number {
  if (title.length <= 8) return 120;
  if (title.length <= 12) return 104;
  if (title.length <= 20) return 64;
  if (title.length <= 30) return 60;
  if (title.length <= 46) return 52;
  return 46;
}

/** Long descriptions step down a size rather than growing another line. */
function bodySize(text: string): number {
  return text.length > 100 ? 28 : 30;
}

/** Cut on a word boundary, never mid-word. */
function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–—-]+$/, '')}…`;
}

/**
 * Line-break hygiene, done with non-breaking characters so it holds in any
 * renderer. Four rules, in order:
 *   - a hyphenated word never splits across lines ("sa-i" is one word);
 *   - a dash stays with the word before it, so no line ever begins with "-";
 *   - a one-letter word ("I", "a") is never stranded at the end of a line;
 *   - the last line never holds a single word ("projects.").
 *
 * Escapes, not literal characters: a bare non-breaking space in source is
 * invisible and does not survive a careless edit.
 */
function tidy(text: string): string {
  return text
    // U+2011 is the non-breaking hyphen. Poppins has the glyph, so it looks
    // identical to "-" and cannot break. U+2060 (word joiner) is NOT usable
    // here: Poppins lacks it and Satori renders it as a visible gap.
    .replace(/(\p{L})-(\p{L})/gu, '$1\u2011$2')
    .replace(/\s+([\u2014\u2013])\s+/g, '\u00a0$1 ')
    .replace(/(^|\s)([\p{L}\p{N}])\s+/gu, '$1$2\u00a0')
    .replace(/\s+(\S+)$/, '\u00a0$1');
}

/** Immutable: the URL carries a version, so the bytes for it never change. */
const CACHE_HEADER = 'public, max-age=31536000, s-maxage=31536000, immutable';

export async function renderCard(spec: CardSpec): Promise<Response> {
  const [regular, semibold] = await fonts;
  const domain = new URL(SITE_URL).host;

  const title = clamp(spec.title, TITLE_MAX);
  const description = clamp(spec.description, BODY_MAX);

  const png = await new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          position: 'relative',
          background: COLOR.ground,
          fontFamily: 'Poppins',
        }}
      >
        {/* The section's icon, drawn large and pale. At WhatsApp's thumbnail
            size this silhouette is what tells one card from another. */}
        <div
          style={{
            position: 'absolute',
            right: 140,
            top: (HEIGHT - MARK_SIZE) / 2,
            display: 'flex',
          }}
        >
          <Icon name={spec.icon} size={MARK_SIZE} color={COLOR.wash} strokeWidth={1.25} />
        </div>

        {/* The sprocket column from the site's original card — keeps the family
            resemblance between the generic card and these. */}
        <div
          style={{
            position: 'absolute',
            right: 62,
            top: -20,
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{ width: 34, height: 52, borderRadius: 8, background: COLOR.sprocket }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: TEXT_LEFT,
            width: TEXT_LEFT + TEXT_WIDTH,
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: COLOR.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={spec.icon} size={32} color="#ffffff" strokeWidth={2} />
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 3,
                color: COLOR.muted,
                textTransform: 'uppercase',
              }}
            >
              {spec.eyebrow}
            </div>
          </div>

          <div
            style={{
              fontSize: titleSize(title),
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: COLOR.ink,
            }}
          >
            {title}
          </div>

          <div style={{ width: 132, height: 6, background: COLOR.accent, margin: '30px 0 30px' }} />

          <div
            style={{
              fontSize: bodySize(description),
              fontWeight: 400,
              lineHeight: 1.4,
              color: COLOR.body,
              maxWidth: TEXT_WIDTH,
            }}
          >
            {tidy(description)}
          </div>

          <div style={{ display: 'flex', marginTop: 40, fontSize: 24, fontWeight: 400 }}>
            <span style={{ color: COLOR.muted }}>{domain}</span>
            {spec.path && <span style={{ color: COLOR.accent }}>{spec.path}</span>}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Poppins', data: regular, weight: 400, style: 'normal' },
        { name: 'Poppins', data: semibold, weight: 600, style: 'normal' },
      ],
    }
  ).arrayBuffer();

  // Same encoder settings as the /og photo transformer, one notch higher on
  // quality: flat colour and type show JPEG ringing sooner than photographs do.
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 88, mozjpeg: true }).toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      'content-type': 'image/jpeg',
      'content-length': String(jpeg.byteLength),
      'cache-control': CACHE_HEADER,
      'x-content-type-options': 'nosniff',
    },
  });
}
