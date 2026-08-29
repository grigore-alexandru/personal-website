// No 'use client' directive — this is a shared utility module, not a React component.
// createBrowserClient accesses document.cookie only when auth operations are performed
// (not at import time), so importing this module on the server is safe.
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../types/database';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createBrowserSupabaseClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
