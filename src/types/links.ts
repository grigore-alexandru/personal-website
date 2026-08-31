/**
 * Types for the link redirector & interstitial system.
 *
 * Wire format is snake_case (Supabase); everything above `linksService` speaks
 * camelCase. The mapping lives in `src/utils/linksService.ts`.
 */

export type LinkStatus = 'active' | 'paused' | 'archived';

export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export interface Link {
  id: string;
  name: string;
  slug: string;
  destinationUrl: string;
  description: string | null;
  status: LinkStatus;
  expiresAt: string | null;
  maxClicks: number | null;
  clickCount: number;
  interstitialEnabled: boolean;
  interstitialCode: string | null;
  interstitialFallbackSeconds: number;
  createdAt: string;
  updatedAt: string;
}

/** Fields required to create a link. The DB fills in everything else. */
export interface NewLinkInput {
  name: string;
  slug: string;
  destinationUrl: string;
  description?: string | null;
  expiresAt?: string | null;
  maxClicks?: number | null;
}

/** Any subset of a link's mutable fields. `slug` is deliberately absent — it is
 *  immutable once created, because changing it would break printed QR codes. */
export type LinkPatch = Partial<
  Pick<
    Link,
    | 'name'
    | 'destinationUrl'
    | 'description'
    | 'status'
    | 'expiresAt'
    | 'maxClicks'
    | 'interstitialEnabled'
    | 'interstitialCode'
    | 'interstitialFallbackSeconds'
  >
>;

export interface DestinationHistoryEntry {
  id: string;
  oldDestinationUrl: string;
  changedAt: string;
}

export interface LinkStats {
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt: string | null;
  /** Exactly 30 entries, oldest first, zero-filled. */
  daily: Array<{ day: string; clicks: number }>;
  devices: Record<DeviceType, number>;
  /** Sorted by clicks desc. Missing referrers are bucketed as 'Direct / QR scan'. */
  referrers: Array<{ referrer: string; clicks: number }>;
}

/** The shape the redirect route needs — and the ONLY fields `register_click`
 *  returns to an anonymous caller. */
export interface RedirectTarget {
  destinationUrl: string;
  interstitialEnabled: boolean;
  interstitialCode: string | null;
  interstitialFallbackSeconds: number;
}

/** Field-level validation errors, keyed by form field name. */
export type LinkFormErrors = Partial<
  Record<
    | 'name'
    | 'slug'
    | 'destinationUrl'
    | 'description'
    | 'expiresAt'
    | 'maxClicks'
    | 'interstitialCode'
    | 'interstitialFallbackSeconds',
    string
  >
>;

/** A link being created, still held in local state — no DB row exists yet. */
export interface LinkDraft {
  name: string;
  slug: string;
  destinationUrl: string;
  description: string;
  expiresAt: string;
  maxClicks: string;
}
