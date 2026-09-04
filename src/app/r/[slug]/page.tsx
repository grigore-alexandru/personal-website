import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '../../../lib/supabase';
import { parseRequestContext } from '../../../utils/linkRequestContext';
import { isPreviewAgent } from '../../../utils/socialCrawler';
import { resolvePreview } from '../../../utils/linkPreview';
import { SITE_NAME } from '../../../config/site';
import { LinkUnavailable } from './LinkUnavailable';
import { InterstitialShell } from '../../../components/links/InterstitialShell';

/**
 * `force-dynamic` is FORBIDDEN across this project — with exactly one exception,
 * which is this file.
 *
 * Every other route is a content page that can and must be statically generated
 * and revalidated on demand. This one is not a content page: it is a
 * per-visitor, side-effecting endpoint. Each request registers a click, may
 * auto-pause the link on expiry or click limit, and resolves a destination that
 * the admin can change at any moment. Caching it would silently break all three.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

interface RedirectResult {
  destination_url: string;
  interstitial_enabled: boolean;
  interstitial_code: string | null;
  interstitial_fallback_seconds: number;
}

/** Read-only resolve. Deliberately NOT register_click — see the note below. */
async function resolveDestination(slug: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('resolve_link_destination', {
    p_slug: slug,
  });

  if (error) {
    console.error('[r/[slug]] resolve_link_destination failed:', error.message);
    return null;
  }

  return (data as { destination_url: string }[] | null)?.[0]?.destination_url ?? null;
}

/**
 * A short link shows the card of whatever it points at.
 *
 * Only crawlers ever see this head — a visitor is redirected before anything
 * paints — so the resolve and the scrape are gated on the User-Agent and cost
 * a normal visit nothing.
 *
 * og:url is set to the DESTINATION, not to the short link. Facebook treats
 * og:url as canonical, so this makes a share of /r/x and a share of the page
 * itself collapse into the same object and accumulate the same engagement.
 * The short link stays noindex regardless: mirror the card, never the index
 * entry.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const noindex = { index: false, follow: false } as const;
  const userAgent = headers().get('user-agent');

  if (!isPreviewAgent(userAgent)) {
    return { title: 'Redirecting…', robots: noindex };
  }

  const destination = await resolveDestination(params.slug);
  if (!destination) {
    return { title: 'Link unavailable', robots: noindex };
  }

  const preview = await resolvePreview(destination);
  if (!preview) {
    // Unknown internal route, or an external site we could not read in time.
    // The redirect still works; the crawler just gets one hop instead of zero.
    return { title: 'Redirecting…', robots: noindex };
  }

  const images = preview.image
    ? [
        {
          url: preview.image,
          alt: preview.imageAlt ?? preview.title,
          // Only declared for our own images, which ogImage() forces to
          // 1200x630. Guessing at a third party's dimensions would reproduce
          // exactly the bug this project just fixed on its own pages.
          ...(preview.hasKnownDimensions
            ? { width: 1200, height: 630, type: 'image/jpeg' }
            : {}),
        },
      ]
    : [];

  return {
    title: { absolute: preview.title },
    description: preview.description || undefined,
    robots: noindex,
    openGraph: {
      type: preview.type as 'website',
      siteName: preview.siteName ?? SITE_NAME,
      url: preview.url,
      title: preview.title,
      description: preview.description || undefined,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: preview.title,
      description: preview.description || undefined,
      images: preview.image ? [preview.image] : [],
    },
  };
}

export default async function ShortLinkPage({ params }: PageProps) {
  const headerList = headers();

  // A crawler must not be redirected — it would never see the mirrored head —
  // and must not register a click. Every platform prefetches, so counting those
  // hits inflated the analytics and, on a link with max_clicks, could exhaust
  // the limit and auto-pause it before a human arrived.
  //
  // generateMetadata has already done the work; this body exists only so there
  // is a 200 response to attach it to.
  if (isPreviewAgent(headerList.get('user-agent'))) {
    return null;
  }

  const { referrerDomain, deviceType, visitorHash } = parseRequestContext({
    referer: headerList.get('referer'),
    userAgent: headerList.get('user-agent'),
    forwardedFor: headerList.get('x-forwarded-for'),
    realIp: headerList.get('x-real-ip'),
    ownHost: headerList.get('host'),
    salt: process.env.LINK_HASH_SALT,
  });

  // register_click is the only thing an anonymous visitor may execute: it
  // resolves the slug, enforces status/expiry/limit, logs the click and
  // increments the counter — atomically, under a row lock.
  const { data, error } = await supabase.rpc('register_click', {
    p_slug: params.slug,
    p_referrer: referrerDomain,
    p_device: deviceType,
    p_visitor_hash: visitorHash,
  });

  if (error) {
    console.error('[r/[slug]] register_click failed:', error.message);
    return <LinkUnavailable />;
  }

  const target = (data as RedirectResult[] | null)?.[0];

  // No row means: unknown slug, archived, paused, expired, or over the click
  // limit. All of them render the same page on purpose.
  if (!target) {
    return <LinkUnavailable />;
  }

  const code = target.interstitial_code?.trim();

  if (!target.interstitial_enabled || !code) {
    redirect(target.destination_url);
  }

  return (
    <InterstitialShell
      code={code as string}
      destination={target.destination_url}
      fallbackSeconds={target.interstitial_fallback_seconds}
    />
  );
}
