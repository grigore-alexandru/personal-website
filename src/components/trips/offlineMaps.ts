// The transit map PDFs. They live in Mega S4 (bucket "documents") and are kept on the device in the Cache API, so
// they open without internet after the app has been online once. Replacing a map means uploading a new file name.
import { getMegaS4PublicUrl } from '@/lib/s4';

export type MapPdf = { id: string; title: string; hint: string; key: string; size: string };

export const MAP_PDFS: MapPdf[] = [
  { id: 'muni', title: 'Muni', hint: 'Autobuze și tramvaie în San Francisco', key: 'trips/sf-2026/maps/sfmta-muni-system-map-2023-08.pdf', size: '3 MB' },
  { id: 'bart', title: 'BART', hint: 'Metrou în toată Bay Area', key: 'trips/sf-2026/maps/bart-system-map.pdf', size: '140 KB' },
];

/** Also listed in the service worker's KEEP, so its clean-up leaves it alone. */
export const DOCS_CACHE = 'trip-docs-v1';

const urlOf = (doc: MapPdf) => getMegaS4PublicUrl('documents', doc.key);

async function download(cache: Cache, doc: MapPdf): Promise<Response> {
  const res = await fetch(urlOf(doc), { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await cache.put(urlOf(doc), res.clone());
  return res;
}

export async function isMapSaved(doc: MapPdf): Promise<boolean> {
  return !!(await (await caches.open(DOCS_CACHE)).match(urlOf(doc)));
}

/** The PDF's bytes: from the device when saved, else downloaded and saved now. */
export async function loadMap(doc: MapPdf): Promise<ArrayBuffer> {
  const cache = await caches.open(DOCS_CACHE);
  const res = (await cache.match(urlOf(doc))) ?? (await download(cache, doc));
  return res.arrayBuffer();
}

let saving: Promise<void> | null = null;

/** Download whatever isn't on the device yet and ask the browser not to evict it. Safe to call often. */
export function saveAllMaps(): Promise<void> {
  saving ??= (async () => {
    void navigator.storage?.persist?.().catch(() => undefined);
    const cache = await caches.open(DOCS_CACHE);
    for (const doc of MAP_PDFS) {
      try {
        if (!(await cache.match(urlOf(doc)))) await download(cache, doc);
      } catch {
        /* no connection right now: the next online start tries again */
      }
    }
  })().finally(() => {
    saving = null;
  });
  return saving;
}
