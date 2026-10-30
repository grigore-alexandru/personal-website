import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TripProvider } from '@/components/trips/TripProvider';
import { TripShell } from '@/components/trips/TripShell';

/**
 * San Francisco trip app (2–19 Nov 2026). Logged-out visitors are sent to /admin/login by the
 * /admin middleware, like Runway; this layout additionally refuses signed-in non-admins on the
 * server (RLS on public.trip_documents would give them nothing anyway). The data is one JSON
 * document loaded and saved in the browser by TripProvider.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'San Francisco' },
  robots: { index: false, follow: false },
  manifest: '/trips/sf-2026/manifest.webmanifest',
  icons: { apple: '/trips/sf-2026/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'San Francisco', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default async function TripLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) notFound();

  return (
    <TripProvider>
      <TripShell>{children}</TripShell>
    </TripProvider>
  );
}
