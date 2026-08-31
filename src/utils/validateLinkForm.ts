import { validateSlug } from './validateSlug';
import type { LinkFormErrors } from '../types/links';

export const DESCRIPTION_MAX_LENGTH = 200;
export const NAME_MAX_LENGTH = 80;
export const FALLBACK_MIN_SECONDS = 1;
export const FALLBACK_MAX_SECONDS = 30;
export const DEFAULT_FALLBACK_SECONDS = 8;

/** Random slug for links whose name shouldn't be guessable from the URL. */
export function randomSlugToken(length = 8): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(length))
      : Array.from({ length }, () => Math.floor(Math.random() * 256));

  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length > NAME_MAX_LENGTH) return `Name must be ${NAME_MAX_LENGTH} characters or fewer`;
  return undefined;
}

export function validateLinkSlug(slug: string): string | undefined {
  const result = validateSlug(slug);
  if (!result.isValid) return result.error;
  if (slug.length > 64) return 'Slug must be 64 characters or fewer';
  return undefined;
}

/**
 * A destination has to be a real absolute http(s) URL.
 *
 * Anything else — a bare domain, a relative path, a javascript: or data: URI —
 * is rejected here as well as by the DB constraint. Requiring the scheme is
 * deliberate: "example.com" would otherwise resolve relative to our own site
 * and silently send visitors nowhere.
 */
export function validateDestinationUrl(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return 'Destination URL is required';

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'Enter a full URL, including https://';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Destination must start with http:// or https://';
  }

  if (!parsed.hostname) return 'Enter a valid URL';

  return undefined;
}

export function validateDescription(description: string): string | undefined {
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`;
  }
  return undefined;
}

/** Empty means "no expiry", which is valid. A set date must be in the future. */
export function validateExpiresAt(value: string): string | undefined {
  if (!value.trim()) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Enter a valid date';
  if (parsed.getTime() <= Date.now()) return 'Expiry date must be in the future';

  return undefined;
}

/** Empty means "no limit", which is valid. */
export function validateMaxClicks(value: string): string | undefined {
  if (!value.trim()) return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 'Enter a whole number';
  if (parsed < 1) return 'Click limit must be at least 1';

  return undefined;
}

export function validateFallbackSeconds(value: number): string | undefined {
  if (!Number.isInteger(value)) return 'Enter a whole number of seconds';
  if (value < FALLBACK_MIN_SECONDS || value > FALLBACK_MAX_SECONDS) {
    return `Timeout must be between ${FALLBACK_MIN_SECONDS} and ${FALLBACK_MAX_SECONDS} seconds`;
  }
  return undefined;
}

/**
 * Turning the interstitial on with nothing in it is blocked rather than treated
 * as a no-op: an enabled-but-empty interstitial would render a blank frame and
 * make every visitor wait out the full fallback timer for nothing.
 */
export function validateInterstitialCode(
  code: string | null,
  enabled: boolean
): string | undefined {
  if (!enabled) return undefined;
  if (!code || !code.trim()) return 'Add some code, or switch the interstitial off';
  return undefined;
}

export interface LinkFormValues {
  name: string;
  slug: string;
  destinationUrl: string;
  description: string;
  expiresAt: string;
  maxClicks: string;
}

/** Every field at once — used before a create, and before a card may collapse. */
export function validateLinkForm(values: LinkFormValues): LinkFormErrors {
  const errors: LinkFormErrors = {};

  const name = validateName(values.name);
  if (name) errors.name = name;

  const slug = validateLinkSlug(values.slug);
  if (slug) errors.slug = slug;

  const destinationUrl = validateDestinationUrl(values.destinationUrl);
  if (destinationUrl) errors.destinationUrl = destinationUrl;

  const description = validateDescription(values.description);
  if (description) errors.description = description;

  const expiresAt = validateExpiresAt(values.expiresAt);
  if (expiresAt) errors.expiresAt = expiresAt;

  const maxClicks = validateMaxClicks(values.maxClicks);
  if (maxClicks) errors.maxClicks = maxClicks;

  return errors;
}

export function hasErrors(errors: LinkFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
