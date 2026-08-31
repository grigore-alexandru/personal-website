import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '../../../lib/supabase';
import { parseRequestContext } from '../../../utils/linkRequestContext';
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

export const metadata: Metadata = {
  title: 'Redirecting…',
  robots: { index: false, follow: false },
};

interface RedirectResult {
  destination_url: string;
  interstitial_enabled: boolean;
  interstitial_code: string | null;
  interstitial_fallback_seconds: number;
}

export default async function ShortLinkPage({ params }: { params: { slug: string } }) {
  const headerList = headers();

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
