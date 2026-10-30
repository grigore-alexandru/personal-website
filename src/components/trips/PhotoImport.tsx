'use client';

import { useState } from 'react';
import { ImageUp } from 'lucide-react';
import { useTrip } from './TripProvider';
import { TRIP_ID } from './tripConfig';

const DIR_KEY = 'trip:media-dir';

/**
 * Local-only (next dev) card on Locuri: imports the Obsidian photos that are not uploaded yet through
 * /api/admin/trips/photos. Not rendered in production builds.
 */
export function PhotoImport() {
  const { doc, toast } = useTrip();
  const pending = doc.places.reduce((n, p) => n + p.photos.filter((ph) => !ph.path).length, 0);
  const [dir, setDir] = useState(() => {
    try {
      return localStorage.getItem(DIR_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [busy, setBusy] = useState(false);

  if (process.env.NODE_ENV !== 'development' || pending === 0) return null;

  const run = async () => {
    if (!dir.trim()) return toast('Scrie calea folderului Media din Obsidian.', 'error');
    try {
      localStorage.setItem(DIR_KEY, dir.trim());
    } catch {
      /* convenience only */
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/trips/photos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tripId: TRIP_ID, mediaDir: dir.trim() }),
      });
      const data = (await res.json()) as { uploaded?: string[]; missing?: string[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      toast(`${data.uploaded?.length ?? 0} poze încărcate${data.missing?.length ? `, ${data.missing.length} lipsă` : ''}. Apar la următoarea sincronizare.`);
    } catch (e) {
      toast(`Importul a eșuat: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-neutral-400 bg-white p-3 space-y-2">
      <p className="text-sm font-semibold">
        {pending} poze din Obsidian nu sunt încărcate <span className="font-normal text-neutral-500">(doar local)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={dir}
          onChange={(e) => setDir(e.target.value)}
          placeholder="…/Obsidian/Writing/Media"
          aria-label="Folderul Media din Obsidian"
          className="flex-1 min-w-[220px] min-h-[40px] rounded-lg border border-neutral-300 px-2 text-xs font-mono"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void run()}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
        >
          <ImageUp size={16} /> {busy ? 'Se încarcă…' : 'Importă pozele'}
        </button>
      </div>
      <p className="text-[11px] text-neutral-500">
        Dacă folderul e pe Google Drive și importul nu pornește, serverul local nu are acces la Drive: copiază pozele într-un folder local și pune calea lui aici.
      </p>
    </div>
  );
}
