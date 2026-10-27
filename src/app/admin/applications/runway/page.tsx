import type { Metadata, Viewport } from 'next';

/**
 * Application Runway (the university applications timeline). The app itself is a static build in
 * /public/apps/runway (from the application-runway repo, `npm run build:web`); its data comes from
 * /api/admin/runway. Protected by the /admin middleware; shown full-screen, without the admin header.
 */
export const metadata: Metadata = {
  title: 'Application Runway',
  robots: { index: false, follow: false },
  icons: { icon: '/apps/runway/icons/favicon-64.png', apple: '/apps/runway/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Runway', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RunwayPage() {
  return (
    <iframe
      src="/apps/runway/index.html"
      title="Application Runway"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100dvh', border: 0, zIndex: 50, background: '#fff' }}
    />
  );
}
