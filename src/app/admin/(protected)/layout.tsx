import { ReactNode } from 'react';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { AdminHeader } from '../../../components/admin/AdminHeader';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createServerSupabaseClient();
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
