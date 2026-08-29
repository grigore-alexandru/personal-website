import { ReactNode } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminHeader } from './AdminHeader';

/**
 * Shared shell for all authenticated admin sections (blog, portfolio, content,
 * and the protected dashboard). Each section layout re-exports this component
 * as its default export and declares `dynamic = 'force-dynamic'` directly (route
 * segment configs must be static exports from the route file itself).
 *
 * To change auth behaviour, spacing, or the header — edit only this file.
 */
export default async function AdminSectionLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminHeader userEmail={user?.email ?? null} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
