'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Place } from '@/lib/trips/schema';
import { formatDateShort, navigationTarget } from '@/lib/trips/time';
import { useTrip } from '../TripProvider';
import { DAY_KIND, UNSCHEDULED_HEX, placeHref } from '../tripConfig';
import { dayOptionLabel, scheduledDates } from '../helpers';
import { NavigateButtons, PlacePhoto } from '../ui';
import type { MapMarker } from '../MapView';

// Leaflet touches `window` at import time: client-only, and only in this route's chunk.
const MapView = dynamic(() => import('../MapView'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-neutral-500">Se încarcă harta…</div>,
});

/** Hartă — every place, or one day's stops in order. */
export function HartaScreen() {
  const { doc, places } = useTrip();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const day = doc.days.find((d) => d.date === search?.get('zi')) ?? null;
  const [selected, setSelected] = useState<string | null>(null);
  const [fit, setFit] = useState<{ mode: 'city' | 'all'; n: number }>({ mode: 'all', n: 0 });
  const dates = useMemo(() => scheduledDates(doc), [doc]);
  const kindOfDate = useMemo(() => new Map(doc.days.map((d) => [d.date, d.kind])), [doc]);

  const markers: MapMarker[] = useMemo(() => {
    if (day) {
      const seen = new Set<string>();
      return day.items
        .filter((i) => i.placeId && places.get(i.placeId)?.location && !seen.has(i.placeId) && seen.add(i.placeId))
        .map((i, n) => {
          const p = places.get(i.placeId!)!;
          return { id: p.id, lat: p.location!.lat, lng: p.location!.lng, color: DAY_KIND[day.kind].hex, label: String(n + 1), title: p.name };
        });
    }
    return doc.places
      .filter((p) => p.location)
      .map((p) => {
        const first = dates.get(p.id)?.[0];
        return { id: p.id, lat: p.location!.lat, lng: p.location!.lng, color: first ? DAY_KIND[kindOfDate.get(first)!].hex : UNSCHEDULED_HEX, title: p.name };
      });
  }, [day, doc, places, dates, kindOfDate]);

  const setDay = (date: string) => {
    setSelected(null);
    router.replace(date ? `${pathname}?zi=${date}` : pathname ?? '');
  };

  const sel: Place | undefined = selected ? places.get(selected) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold mr-auto">Hartă</h1>
        <select value={day?.date ?? ''} onChange={(e) => setDay(e.target.value)} className="min-h-[44px] max-w-full rounded-xl border border-neutral-300 bg-white px-2 text-sm" aria-label="Filtru">
          <option value="">Toată călătoria</option>
          {doc.days.map((d) => (
            <option key={d.date} value={d.date}>
              {dayOptionLabel(d)}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setFit({ mode: 'city', n: fit.n + 1 })} className="min-h-[44px] px-3 rounded-xl border border-neutral-300 bg-white text-sm font-semibold">
          Oraș
        </button>
        <button type="button" onClick={() => setFit({ mode: 'all', n: fit.n + 1 })} className="min-h-[44px] px-3 rounded-xl border border-neutral-300 bg-white text-sm font-semibold">
          Tot
        </button>
      </div>
      {day && <p className="text-xs text-neutral-500">Liniile arată ordinea zilei, nu traseul.</p>}

      <div className="relative h-[62vh] min-h-[360px] rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 isolate">
        <MapView markers={markers} base={doc.trip.base} line={!!day} fit={fit} onSelect={setSelected} />

        {sel && (
          <div className="absolute inset-x-2 bottom-2 z-[500] rounded-2xl bg-white shadow-lg border border-neutral-200 p-3">
            <button type="button" onClick={() => setSelected(null)} aria-label="Închide" className="absolute right-2 top-2 w-8 h-8 inline-flex items-center justify-center text-neutral-500">
              <X size={18} />
            </button>
            <div className="flex gap-3 pr-8">
              <PlacePhoto place={sel} thumb className="w-16 h-16 rounded-xl flex-shrink-0" sizes="64px" />
              <div className="min-w-0">
                <p className="font-bold leading-tight">{sel.name}</p>
                <p className="text-xs text-neutral-500">{(dates.get(sel.id) ?? []).map(formatDateShort).join(', ') || 'neprogramat'}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <NavigateButtons target={navigationTarget(sel)} size="sm" />
              <Link href={placeHref(sel.id)} className="text-sm font-semibold underline underline-offset-2">
                Vezi locul
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
        {Object.values(DAY_KIND).map((k) => (
          <span key={k.label} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: k.hex }} />
            {k.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: UNSCHEDULED_HEX }} />
          neprogramat
        </span>
      </div>
    </div>
  );
}
