import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from './supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// On the server (Server Components, API routes): plain anon client — RLS allows
// public reads, and write operations are never performed server-side in this project.
//
// In the browser: the @supabase/ssr cookie-aware singleton, which is the SAME
// instance used by signIn() in authService.ts.  The auth session lives in
// cookies, so every service-layer write (UPDATE / INSERT / DELETE) is
// authenticated and passes RLS.
//
// Type annotation uses SupabaseClient (= SupabaseClient<any>) to match the
// originally committed, untyped client.  This keeps the service files — which
// were written against an any-typed client — type-error-free.
export const supabase: SupabaseClient = typeof window === 'undefined'
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createBrowserSupabaseClient() as unknown as SupabaseClient);
