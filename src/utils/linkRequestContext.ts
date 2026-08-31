import { createHash } from 'crypto';

export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export interface LinkRequestContext {
  referrerDomain: string | null;
  deviceType: DeviceType;
  visitorHash: string | null;
}

/**
 * Hostname of the referring page, or null when the visitor arrived with no
 * referrer at all (the normal case for a scanned QR code or a typed URL) or
 * came from our own site. Only the hostname is kept — never the full URL, which
 * could carry query parameters belonging to another site.
 */
export function referrerDomainFrom(referer: string | null, ownHost?: string | null): string | null {
  if (!referer) return null;

  try {
    const { hostname } = new URL(referer);
    if (!hostname) return null;
    if (ownHost && hostname.toLowerCase() === ownHost.toLowerCase()) return null;
    return hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Coarse device bucket. Order matters: iPads and Android tablets both match the
 * mobile-ish patterns, so tablets are ruled out first.
 */
export function deviceTypeFrom(userAgent: string | null): DeviceType {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|windows phone/.test(ua)) return 'mobile';

  return 'desktop';
}

/**
 * A salted, daily-rotating fingerprint used solely to count unique clicks.
 *
 * The raw IP is never persisted and never leaves this function. Because the
 * current date is part of the digest, the same visitor produces a different
 * hash tomorrow, so nothing can be correlated across days. Without a salt
 * configured we return null rather than emitting a weak, unsalted hash —
 * unique clicks then degrade to total clicks, which is the safe failure.
 */
export function visitorHashFrom(
  ip: string | null,
  userAgent: string | null,
  salt: string | undefined,
  date: string
): string | null {
  if (!salt) return null;
  if (!ip && !userAgent) return null;

  return createHash('sha256')
    .update(`${ip ?? ''}|${userAgent ?? ''}|${salt}|${date}`)
    .digest('hex');
}

/** First entry of an X-Forwarded-For chain — the original client. */
export function clientIpFrom(forwardedFor: string | null, realIp: string | null): string | null {
  const first = forwardedFor?.split(',')[0]?.trim();
  return first || realIp || null;
}

/** Convenience wrapper: everything the redirect route needs, in one call. */
export function parseRequestContext(params: {
  referer: string | null;
  userAgent: string | null;
  forwardedFor: string | null;
  realIp: string | null;
  ownHost: string | null;
  salt: string | undefined;
  now?: Date;
}): LinkRequestContext {
  const day = (params.now ?? new Date()).toISOString().slice(0, 10);

  return {
    referrerDomain: referrerDomainFrom(params.referer, params.ownHost),
    deviceType: deviceTypeFrom(params.userAgent),
    visitorHash: visitorHashFrom(
      clientIpFrom(params.forwardedFor, params.realIp),
      params.userAgent,
      params.salt,
      day
    ),
  };
}
