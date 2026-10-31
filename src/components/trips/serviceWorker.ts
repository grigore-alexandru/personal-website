// Service worker for the trip app (served by src/app/admin/trips/sf-2026/sw.js/route.ts, scope /admin/trips/sf-2026/).
// Goal: the installed app opens and works offline on the phone.
//  - pages:  network first (3.5 s), saved per path; offline → the saved copy of that page
//  - static: /_next/static + /trips/sf-2026 icons, cache first (file names are content-hashed)
//  - photos: signed trip-media URLs, cache first keyed by object path (the token in the URL changes)
//  - tiles:  OpenStreetMap tiles already seen, cache first, capped
//  - "warm" message from the app: download every trip page, the scripts they reference, and all photos.
// RSC requests (client-side navigation) go to the network; offline they fail and Next.js falls back to a
// full page load, which this worker answers from the page cache.
export function serviceWorkerSource(version: string, supabaseUrl: string): string {
  const storagePrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/sign/trip-media/`;
  return String.raw`/* trip app service worker — ${version} */
const SCOPE = '/admin/trips/sf-2026/';
const PAGES = 'trip-pages-v1';
const STATIC = 'trip-static-v1';
const PHOTOS = 'trip-photos-v1';
const TILES = 'trip-tiles-v1';
const KEEP = [PAGES, STATIC, PHOTOS, TILES];
const STORAGE = ${JSON.stringify(storagePrefix)};
const MAX_TILES = 600;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (!KEEP.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

const pageKey = (url) => new URL(url).pathname.replace(/\/$/, '');
const photoKey = (url) => { const u = new URL(url); return u.origin + u.pathname; };

async function fromNetworkSavingPage(request) {
  const res = await fetch(request);
  // Never keep redirects (login) or errors as the offline copy of a page.
  if (res.ok && !res.redirected && res.type === 'basic' && (res.headers.get('content-type') || '').includes('text/html')) {
    const cache = await caches.open(PAGES);
    await cache.put(pageKey(request.url), res.clone());
  }
  return res;
}

function offlinePage() {
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Offline</title><body style="font-family:system-ui;padding:24px;line-height:1.5">' +
    '<h1 style="font-size:20px">Pagina nu e salvată offline</h1>' +
    '<p>Deschide aplicația o dată cu internet ca să se descarce tot planul.</p>' +
    '<p><a href="' + SCOPE + 'azi">Mergi la Azi</a></p></body>';
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function page(event) {
  const cache = await caches.open(PAGES);
  const saved = await cache.match(pageKey(event.request.url));
  const network = fromNetworkSavingPage(event.request);
  if (!saved) return network.catch(() => offlinePage());
  // Bad signal: don't wait more than 3.5 s when a saved copy exists; the network still updates it.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(saved), 3500));
  event.waitUntil(network.catch(() => undefined));
  return Promise.race([network.catch(() => saved), timeout]);
}

async function cacheFirst(cacheName, request, key, init) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key || request);
  if (hit) return hit;
  const res = await fetch(init ? request.url : request, init);
  if (res.ok) await cache.put(key || request, res.clone());
  return res;
}

async function tile(request) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  const res = await fetch(request.url, { mode: 'cors', credentials: 'omit' });
  if (res.ok) {
    await cache.put(request.url, res.clone());
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.url.startsWith(STORAGE)) {
    event.respondWith(cacheFirst(PHOTOS, request, photoKey(request.url), { mode: 'cors', credentials: 'omit' }));
    return;
  }
  if (/(^|\.)tile\.openstreetmap\.org$/.test(url.hostname)) {
    event.respondWith(tile(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/trips/sf-2026/')) {
    event.respondWith(cacheFirst(STATIC, request));
    return;
  }
  if (request.mode === 'navigate' && url.pathname.startsWith(SCOPE) && !url.pathname.endsWith('/sw.js')) {
    event.respondWith(page(event));
  }
});

// Scripts and styles a page needs, read from its HTML (script tags and the RSC payload).
function assetsIn(html) {
  const out = new Set();
  const re = /(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\s\\)]+/g;
  for (const m of html.matchAll(re)) out.add(m[0].startsWith('/_next/') ? m[0] : '/_next/' + m[0]);
  return [...out];
}

async function warm({ pages = [], photos = [], refreshPages = false }) {
  const pageCache = await caches.open(PAGES);
  const staticCache = await caches.open(STATIC);
  const photoCache = await caches.open(PHOTOS);
  const assets = new Set();
  for (const p of pages) {
    try {
      let res = refreshPages ? null : await pageCache.match(pageKey(new URL(p, self.location.origin).href));
      if (!res) res = await fromNetworkSavingPage(new Request(p, { credentials: 'same-origin' }));
      if (res && res.ok) for (const a of assetsIn(await res.clone().text())) assets.add(a);
    } catch (e) { /* keep going */ }
  }
  for (const a of assets) {
    try { if (!(await staticCache.match(a))) { const r = await fetch(a); if (r.ok) await staticCache.put(a, r); } } catch (e) {}
  }
  for (const url of photos) {
    try {
      const key = photoKey(url);
      if (await photoCache.match(key)) continue;
      const r = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (r.ok) await photoCache.put(key, r);
    } catch (e) {}
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'warm') event.waitUntil(warm(event.data));
});
`;
}
