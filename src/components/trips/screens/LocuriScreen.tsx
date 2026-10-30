'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, Ticket } from 'lucide-react';
import type { Place } from '@/lib/trips/schema';
import { sumLines } from '@/lib/trips/money';
import { formatDateShort } from '@/lib/trips/time';
import { useTrip } from '../TripProvider';
import { AREA, PLACE_KIND, placeHref } from '../tripConfig';
import { donePlaceIds, scheduledDates } from '../helpers';
import { Chip, MoneyText, PlacePhoto } from '../ui';
import { useAiContext } from '../ai';
import { placesPage } from '../aiPages';
import { PhotoImport } from '../PhotoImport';

type Filter = 'all' | 'unscheduled' | 'scheduled' | 'done';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Toate' },
  { id: 'unscheduled', label: 'Neprogramate' },
  { id: 'scheduled', label: 'Programate' },
  { id: 'done', label: 'Făcute' },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-[36px] px-3 rounded-full text-xs font-semibold border ${on ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-300'}`}
    >
      {children}
    </button>
  );
}

/** Locuri — every place from the note, with search and filters. */
export function LocuriScreen() {
  const { doc } = useTrip();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [kind, setKind] = useState<Place['kind'] | null>(null);
  const [area, setArea] = useState<Place['area'] | null>(null);
  const dates = useMemo(() => scheduledDates(doc), [doc]);
  const done = useMemo(() => donePlaceIds(doc), [doc]);
  const kinds = [...new Set(doc.places.map((p) => p.kind))];
  const areas = [...new Set(doc.places.map((p) => p.area))];

  const list = doc.places.filter((p) => {
    if (q && !norm(`${p.name} ${p.location?.name ?? ''} ${p.notes ?? ''}`).includes(norm(q))) return false;
    if (kind && p.kind !== kind) return false;
    if (area && p.area !== area) return false;
    const scheduled = dates.has(p.id) || doc.places.some((c) => c.parentId === p.id && dates.has(c.id));
    if (filter === 'unscheduled') return !scheduled;
    if (filter === 'scheduled') return scheduled;
    if (filter === 'done') return done.has(p.id);
    return true;
  });

  useAiContext(placesPage(doc, list));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Locuri</h1>
      <PhotoImport />
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută" className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-white pl-9 pr-3 text-sm" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Toggle key={f.id} on={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Toggle>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <Toggle key={k} on={kind === k} onClick={() => setKind(kind === k ? null : k)}>
            {PLACE_KIND[k]}
          </Toggle>
        ))}
        <span className="w-px bg-neutral-200 mx-1" />
        {areas.map((a) => (
          <Toggle key={a} on={area === a} onClick={() => setArea(area === a ? null : a)}>
            {AREA[a]}
          </Toggle>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">Niciun loc pentru filtrele alese.</p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {list.map((p) => {
            const d = dates.get(p.id) ?? [];
            const template = sumLines(p.costTemplate);
            return (
              <li key={p.id}>
                <Link href={placeHref(p.id)} className="block h-full rounded-2xl overflow-hidden border border-neutral-200 bg-white">
                  <PlacePhoto place={p} thumb className="aspect-[4/3] w-full" sizes="(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw" />
                  <div className="p-2.5 space-y-1">
                    <p className="text-sm font-semibold leading-tight">{p.name}</p>
                    <p className="text-[11px] text-neutral-500">
                      {PLACE_KIND[p.kind]} · {AREA[p.area]}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {d.map((x) => (
                        <Chip key={x} tone="blue">
                          {formatDateShort(x)}
                        </Chip>
                      ))}
                      {p.booking?.required && (
                        <Chip tone={p.booking.status === 'booked' ? 'green' : p.booking.status === 'todo' ? 'amber' : 'neutral'}>
                          <Ticket size={10} />
                          {p.booking.status === 'booked' ? 'luat' : p.booking.status === 'todo' ? 'de luat' : 'nu e nevoie'}
                        </Chip>
                      )}
                      {done.has(p.id) && <Chip tone="green">făcut</Chip>}
                    </div>
                    {template.lines > 0 && <MoneyText money={template} className="text-xs font-semibold text-neutral-800" />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
