import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';

/**
 * Application Runway data (one JSON document in public.runway_documents, row "main").
 * Same contract as the app's local dev server: GET → { status, doc, hash }, PUT with If-Match → { status, hash }.
 * Only signed-in admins get through (route check here, RLS in the database).
 */
export const dynamic = 'force-dynamic';

const noStore = { 'cache-control': 'no-store' };

async function adminClient(): Promise<SupabaseClient | null> {
  const supabase = (await createServerSupabaseClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

export async function GET(request: NextRequest) {
  const supabase = await adminClient();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Sign in at /admin/login' }, { status: 401, headers: noStore });
  const hashOnly = request.nextUrl.searchParams.has('hashOnly');
  const { data, error } = await supabase
    .from('runway_documents')
    .select(hashOnly ? 'hash' : 'doc, hash')
    .eq('id', 'main')
    .maybeSingle();
  if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 500, headers: noStore });
  if (!data) return NextResponse.json({ status: 'error', message: 'No runway data yet' }, { status: 404, headers: noStore });
  const row = data as unknown as { doc?: unknown; hash: string };
  return NextResponse.json(hashOnly ? { hash: row.hash } : { status: 'ok', doc: row.doc, hash: row.hash }, { headers: noStore });
}

export async function PUT(request: NextRequest) {
  const supabase = await adminClient();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Sign in at /admin/login' }, { status: 401, headers: noStore });
  let doc: unknown;
  try {
    doc = await request.json();
  } catch {
    return NextResponse.json({ status: 'invalid', issues: [{ path: '(body)', message: 'not valid JSON' }] }, { status: 400, headers: noStore });
  }
  const shape = doc as { version?: unknown; schools?: unknown; tasks?: unknown };
  if (typeof doc !== 'object' || doc === null || !Array.isArray(shape.schools) || !Array.isArray(shape.tasks)) {
    return NextResponse.json({ status: 'invalid', issues: [{ path: '(root)', message: 'not a runway document' }] }, { status: 422, headers: noStore });
  }
  const ifMatch = request.headers.get('if-match') ?? '';
  // Conditional write: only if nobody changed the row since this client last read it.
  let query = supabase.from('runway_documents').update({ doc }).eq('id', 'main');
  if (ifMatch) query = query.eq('hash', ifMatch);
  const { data, error } = await query.select('hash');
  if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 500, headers: noStore });
  const rows = (data ?? []) as { hash: string }[];
  if (rows.length === 0) {
    const { data: current } = await supabase.from('runway_documents').select('hash').eq('id', 'main').maybeSingle();
    return NextResponse.json({ status: 'conflict', hash: (current as { hash?: string } | null)?.hash ?? '' }, { status: 409, headers: noStore });
  }
  return NextResponse.json({ status: 'ok', hash: rows[0]!.hash }, { headers: noStore });
}
