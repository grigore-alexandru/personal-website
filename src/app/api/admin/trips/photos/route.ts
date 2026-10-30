import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../../../../../lib/supabase/server';
import { importPhotos } from '../../../../../lib/trips/photoImport';

/**
 * Local-only photo import for the trip app: reads the Obsidian attachments named in each place's
 * `photos[].source` from a folder on this Mac, converts them to WebP and uploads them to the private
 * trip-media bucket with the signed-in admin's session (storage + trip_documents RLS apply).
 * It exists only under `next dev`; in production it answers 404 (there is no Obsidian folder on Vercel).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const noStore = { 'cache-control': 'no-store' };

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });

  const supabase = (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Sign in at /admin/login' }, { status: 401, headers: noStore });
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) return NextResponse.json({ message: 'Admins only' }, { status: 403, headers: noStore });

  let body: { tripId?: string; mediaDir?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'not valid JSON' }, { status: 400, headers: noStore });
  }
  const tripId = body.tripId ?? 'sf-2026';
  if (!body.mediaDir) return NextResponse.json({ message: 'mediaDir is required' }, { status: 400, headers: noStore });

  try {
    const result = await importPhotos({ supabase, tripId, mediaDir: body.mediaDir, force: body.force === true, log: (line) => console.log('[trip photos]', line) });
    return NextResponse.json(result, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : String(e) }, { status: 500, headers: noStore });
  }
}
