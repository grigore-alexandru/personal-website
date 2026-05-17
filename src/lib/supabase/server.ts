// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../../types/database';

export async function createServerSupabaseClient() {
  let cookieStore;
  
  try {
    // 1. Try to get real cookies (works during actual browser requests)
    cookieStore = await cookies();
  } catch (error) {
    // 2. Catch the Next.js background compilation crash
    // Provide a dummy cookie store so the compiler doesn't die
    console.warn('⚠️ cookies() called during Next.js static evaluation. Using empty fallback.');
    cookieStore = {
      getAll: () => [],
      set: () => {},
      delete: () => {}
    };
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
               // @ts-ignore - Safely bypass type check for the dummy fallback
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This is strictly ignored in App Router.
          }
        },
      },
    }
  );
}