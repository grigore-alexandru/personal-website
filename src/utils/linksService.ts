import { supabase } from '../lib/supabase';
import type {
  Link,
  LinkPatch,
  NewLinkInput,
  DestinationHistoryEntry,
  LinkStats,
} from '../types/links';

/** Columns selected everywhere a full Link is returned. */
const LINK_COLUMNS =
  'id, name, slug, destination_url, description, status, expires_at, max_clicks, click_count, interstitial_enabled, interstitial_code, interstitial_fallback_seconds, created_at, updated_at';

type LinkRow = {
  id: string;
  name: string;
  slug: string;
  destination_url: string;
  description: string | null;
  status: Link['status'];
  expires_at: string | null;
  max_clicks: number | null;
  click_count: number;
  interstitial_enabled: boolean;
  interstitial_code: string | null;
  interstitial_fallback_seconds: number;
  created_at: string;
  updated_at: string;
};

function toLink(row: LinkRow): Link {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    destinationUrl: row.destination_url,
    description: row.description,
    status: row.status,
    expiresAt: row.expires_at,
    maxClicks: row.max_clicks,
    clickCount: row.click_count,
    interstitialEnabled: row.interstitial_enabled,
    interstitialCode: row.interstitial_code,
    interstitialFallbackSeconds: row.interstitial_fallback_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** camelCase patch → the snake_case column names the DB expects. */
function toRowPatch(patch: LinkPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (patch.name !== undefined) row.name = patch.name;
  if (patch.destinationUrl !== undefined) row.destination_url = patch.destinationUrl;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.expiresAt !== undefined) row.expires_at = patch.expiresAt;
  if (patch.maxClicks !== undefined) row.max_clicks = patch.maxClicks;
  if (patch.interstitialEnabled !== undefined) row.interstitial_enabled = patch.interstitialEnabled;
  if (patch.interstitialCode !== undefined) row.interstitial_code = patch.interstitialCode;
  if (patch.interstitialFallbackSeconds !== undefined) {
    row.interstitial_fallback_seconds = patch.interstitialFallbackSeconds;
  }

  return row;
}

export async function listLinks(): Promise<Link[]> {
  const { data, error } = await supabase
    .from('links')
    .select(LINK_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LinkRow[]).map(toLink);
}

export async function createLink(input: NewLinkInput): Promise<Link> {
  const { data, error } = await supabase
    .from('links')
    .insert({
      name: input.name,
      slug: input.slug,
      destination_url: input.destinationUrl,
      description: input.description ?? null,
      expires_at: input.expiresAt ?? null,
      max_clicks: input.maxClicks ?? null,
    })
    .select(LINK_COLUMNS)
    .single();

  if (error) {
    // 23505 is the unique violation on slug. Surface it as something a person
    // can act on rather than as a Postgres constraint name.
    if (error.code === '23505') {
      throw new Error('That slug is already taken. Choose another.');
    }
    throw new Error(error.message);
  }

  return toLink(data as unknown as LinkRow);
}

export async function updateLink(id: string, patch: LinkPatch): Promise<Link> {
  const { data, error } = await supabase
    .from('links')
    .update(toRowPatch(patch))
    .eq('id', id)
    .select(LINK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toLink(data as unknown as LinkRow);
}

/** Hard delete. Clicks and destination history cascade with it. */
export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from('links').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** True when the slug is free. Errors resolve to false: never claim a slug is
 *  available on the strength of a failed lookup — the DB constraint is the
 *  real gate, and a false negative here is merely annoying. */
export async function checkLinkSlugUniqueness(slug: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('links')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Error checking link slug uniqueness:', error);
      return false;
    }

    return !data;
  } catch (err) {
    console.error('Error checking link slug uniqueness:', err);
    return false;
  }
}

export async function loadDestinationHistory(linkId: string): Promise<DestinationHistoryEntry[]> {
  const { data, error } = await supabase
    .from('link_destination_history')
    .select('id, old_destination_url, changed_at')
    .eq('link_id', linkId)
    .order('changed_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Array<{
    id: string;
    old_destination_url: string;
    changed_at: string;
  }>).map((row) => ({
    id: row.id,
    oldDestinationUrl: row.old_destination_url,
    changedAt: row.changed_at,
  }));
}

export async function loadLinkStats(linkId: string): Promise<LinkStats> {
  const { data, error } = await supabase.rpc('get_link_stats', { p_link_id: linkId });

  if (error) throw new Error(error.message);

  const raw = data as {
    total_clicks: number;
    unique_clicks: number;
    last_clicked_at: string | null;
    daily: Array<{ day: string; clicks: number }>;
    devices: { mobile: number; desktop: number; tablet: number };
    referrers: Array<{ referrer: string; clicks: number }>;
  };

  return {
    totalClicks: raw.total_clicks,
    uniqueClicks: raw.unique_clicks,
    lastClickedAt: raw.last_clicked_at,
    daily: raw.daily ?? [],
    devices: raw.devices,
    referrers: raw.referrers ?? [],
  };
}
