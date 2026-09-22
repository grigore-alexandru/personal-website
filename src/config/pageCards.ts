/**
 * The share card for every page that has no image of its own.
 *
 * List pages (/blog, /portfolio/content...) and static pages (/contact, /story)
 * have nothing to put in og:image, and neither does a post or project whose
 * hero was never uploaded. They used to all fall back to one generic card
 * reading "Alexandru Grigore — Video director & creative producer", so a shared
 * link to the blog and a shared link to the contact page looked identical.
 *
 * Each entry here becomes a 1200x630 JPEG at build time
 * (src/app/og/card/[card]/route.tsx) naming the page, with its own icon.
 *
 * `description` is deliberately the SAME string the page uses as its meta
 * description — pages import it from here — so the card and the page can never
 * describe themselves differently.
 */

export type PageCardIcon =
  | 'clapperboard'
  | 'layout-grid'
  | 'film'
  | 'monitor-play'
  | 'pen-line'
  | 'user-round'
  | 'mail'
  | 'file-text';

export interface PageCard {
  /** The page's name as a visitor knows it — the nav label, not an SEO title. */
  title: string;
  /** Printed on the card AND used as the page's meta description. */
  description: string;
  /** Small caps line above the title. */
  eyebrow: string;
  icon: PageCardIcon;
  /** Printed in the card footer after the domain. `null` for sections that
   *  have no index page — printing /documents would advertise a 404. */
  path: string | null;
}

const BY_LINE = 'Alexandru Grigore';

export const PAGE_CARDS = {
  home: {
    title: 'Alexandru Grigore',
    description:
      'Video director and creative producer. I work with brands, agencies, and artists on commercials, documentaries, and visual content.',
    eyebrow: 'Bucharest · Romania',
    icon: 'clapperboard',
    path: null,
  },
  portfolio: {
    title: 'Portfolio',
    description: "Projects and work I'm proud of, across clients and formats.",
    eyebrow: BY_LINE,
    icon: 'layout-grid',
    path: '/portfolio',
  },
  projects: {
    title: 'Projects',
    description:
      "Commercials, documentaries, and branded content — the projects I've directed and produced.",
    eyebrow: BY_LINE,
    icon: 'film',
    path: '/portfolio/projects',
  },
  content: {
    title: 'Content',
    description:
      'Videos and photos from the work — reels, edits, and individual pieces across projects.',
    eyebrow: BY_LINE,
    icon: 'monitor-play',
    path: '/portfolio/content',
  },
  blog: {
    title: 'Blog',
    description: "Notes on filmmaking, creative process, and the projects I'm working on.",
    eyebrow: BY_LINE,
    icon: 'pen-line',
    path: '/blog',
  },
  about: {
    title: 'About',
    description: 'A bit about me — who I am, how I got here, and what drives the work.',
    eyebrow: BY_LINE,
    icon: 'user-round',
    path: '/story',
  },
  contact: {
    title: 'Contact',
    description: 'Get in touch — email, call, or find me on social. Based in Bucharest, Romania.',
    eyebrow: BY_LINE,
    icon: 'mail',
    path: '/contact',
  },
  documents: {
    title: 'Documents',
    description: 'Presentations, portfolios and other documents from Alexandru Grigore.',
    eyebrow: BY_LINE,
    icon: 'file-text',
    path: null,
  },
} satisfies Record<string, PageCard>;

export type PageCardKey = keyof typeof PAGE_CARDS;

export function isPageCardKey(value: string): value is PageCardKey {
  return Object.prototype.hasOwnProperty.call(PAGE_CARDS, value);
}
