import { serviceWorkerSource } from '@/components/trips/serviceWorker';

/**
 * The trip app's service worker, served from inside /admin/trips/sf-2026/ so its scope is exactly the
 * trip app (a worker cannot control pages above its own path). The /admin middleware still requires a
 * signed-in session to fetch it. A new deploy changes the version line, so phones pick up the update.
 */
export const dynamic = 'force-static';

export function GET() {
  const body = serviceWorkerSource(process.env.VERCEL_GIT_COMMIT_SHA ?? 'local', process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  return new Response(body, {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}
