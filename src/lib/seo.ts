import type { Metadata } from 'next';
import {
  SITE_URL,
  SITE_NAME,
  SITE_LOCALE,
  SITE_DESCRIPTION,
  ogImage,
  ogTitle,
  pageTitle,
  metaDescription,
} from '../config/site';

/**
 * The single place Open Graph and Twitter metadata is assembled.
 *
 * It exists because of how Next.js merges metadata: a page's `openGraph` object
 * REPLACES the one exported by the root layout — it is not deep-merged. Every
 * page used to hand-write its own, which silently dropped `og:site_name` and
 * `og:locale` from every URL on the domain. Routing all of it through here means
 * the invariants cannot be forgotten again.
 *
 * Callers pass raw values: an untrimmed title, unprocessed database text, the
 * original remote image URL. Normalisation happens here, once.
 */
export interface PageMeta {
  /** Raw title. Used bare for <title> (the layout template adds the suffix) and
   *  trimmed to a 60-char budget for the social tags. */
  title: string;
  /** Raw text. Whitespace-collapsed and cut on a word boundary. */
  description?: string | null;
  /** Site-relative, leading slash: '/blog/my-post'. */
  path: string;
  /** Original remote URL. Transformed to a 1200x630 JPEG; falls back to the
   *  default card when null. */
  image?: string | null;
  imageAlt?: string;
  type?: 'website' | 'article' | 'video.other' | 'profile';
  /** ISO 8601. Emitted as article:published_time / article:modified_time. */
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

export function buildMetadata(meta: PageMeta): Metadata {
  const url = `${SITE_URL}${meta.path}`;
  const image = ogImage(meta.image);
  const socialTitle = ogTitle(meta.title);
  const description = metaDescription(meta.description, SITE_DESCRIPTION);

  return {
    // Trimmed, not raw: the root layout's template appends
    // " | Alexandru Grigore", and an untrimmed title pushed the rendered
    // <title> past 60 characters even when og:title was inside the budget.
    title: pageTitle(meta.title),
    description,
    alternates: { canonical: url },
    ...(meta.noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      // siteName and locale MUST be repeated on every page — see the note above.
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: meta.type ?? 'website',
      url,
      title: socialTitle,
      description,
      images: [
        {
          url: image,
          secureUrl: image,
          type: 'image/jpeg',
          // True by construction: ogImage() forces these exact dimensions.
          width: 1200,
          height: 630,
          alt: meta.imageAlt ?? meta.title,
        },
      ],
      ...(meta.publishedTime ? { publishedTime: meta.publishedTime } : {}),
      ...(meta.modifiedTime ? { modifiedTime: meta.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image],
    },
  };
}

/** Metadata for a page that must never be indexed (404s, drafts, redirectors). */
export function noindexMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}
