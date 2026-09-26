import { PAGE_CARDS, isPageCardKey } from '../../../../config/pageCards';
import { renderCard } from '../../../../lib/og/renderCard';

/**
 * Section cards: /og/card/blog, /og/card/contact, ...
 *
 * Rendered once at build time and served as static files —
 * `force-static` + `generateStaticParams` + `dynamicParams = false` means this
 * handler never runs in production, and an unknown card name is a plain 404.
 * So there is no runtime cost and no way to make the route draw arbitrary text.
 *
 * Used by the list and static pages, and as the fallback for a detail page
 * whose own item card could not be built.
 *
 * Under /og/ and NOT /api/: robots.txt disallows /api/ for every agent, and
 * Meta's scrapers apply robots.txt to the og:image fetch too. See og/route.ts.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PAGE_CARDS).map((card) => ({ card }));
}

export async function GET(_req: Request, { params }: { params: { card: string } }) {
  // Unreachable with dynamicParams = false, but it narrows the type honestly.
  if (!isPageCardKey(params.card)) return new Response('Unknown card', { status: 404 });

  const card = PAGE_CARDS[params.card];

  return renderCard({
    eyebrow: card.eyebrow,
    title: card.title,
    description: card.description,
    icon: card.icon,
    path: card.path,
  });
}
