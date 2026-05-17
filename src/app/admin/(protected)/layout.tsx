import { ReactNode } from 'react';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { AdminHeader } from '../../../components/admin/AdminHeader';

// THIS IS THE FIX: It prevents Next.js from evaluating cookies during static builds
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
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