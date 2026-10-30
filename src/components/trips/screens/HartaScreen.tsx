'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LocateFixed, UtensilsCrossed, X } from 'lucide-react';
import type { Place } from '@/lib/trips/schema';
import { formatDateShort, navigationTarget } from '@/lib/trips/time';
import { useTrip } from '../TripProvider';
import { DAY_KIND, FOOD_HEX, UNSCHEDULED_HEX, placeHref } from '../tripConfig';
import { dayOptionLabel, scheduledDates } from '../helpers';
import { currentPosition, kmText, nearest, type LatLng } from '../geo';
import { useAiContext } from '../ai';
import { mapPage } from '../aiPages';
import { NavigateButtons, PlacePhoto } from '../ui';
import type { MapMarker } from '../MapView';

// Leaflet touches `window` at import time: client-only, and only in this route's chunk.
const MapView = dynamic(() => import('../MapView'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-neutral-500">Se încarcă harta…</div>,
});

const priceOf = (p: Place) => p.notes?.match(/\$\d+–\d+/)?.[0];

/** Hartă — every place, or one day's stops in order; food places as their own layer; "near me". */
export function HartaScreen() {
  const { doc, places, toast } = useTrip();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const day = doc.days.find((d) => d.date === search?.get('zi')) ?? null;
  const [selected, setSelected] = useState<string | null>(null);
  const [fit, setFit] = useState<{ mode: 'city' | 'all'; n: number }>({ mode: 'all', n: 0 });
  const [showFood, setShowFood] = useState(true);
  const [me, setMe] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const dates = useMemo(() => scheduledDates(doc), [doc]);
  const kindOfDate = useMemo(() => new Map(doc.days.map((d) => [d.date, d.kind])), [doc]);
  const foodPlaces = useMemo(() => doc.places.filter((p) => p.kind === 'food'), [doc]);

  const markers: MapMarker[] = useMemo(() => {
    const food: MapMarker[] = showFood
      ? foodPlaces.filter((p) => p.location).map((p) => ({ id: p.id, lat: p.location!.lat, lng: p.location!.lng, color: FOOD_HEX, title: p.name, food: true }))
      : [];
    if (day) {
      const seen = new Set<string>();
      const stops = day.items
        .filter((i) => i.placeId && places.get(i.placeId)?.location && places.get(i.placeId)?.kind !== 'food' && !seen.has(i.placeId) && seen.add(i.placeId))
        .map((i, n) => {
          const p = places.get(i.placeId!)!;
          return { id: p.id, lat: p.location!.lat, lng: p.location!.lng, color: DAY_KIND[day.kind].hex, label: String(n + 1), title: p.name };
        });
      return [...stops, ...food];
    }
    const sights = doc.places
      .filter((p) => p.location && p.kind !== 'food')
      .map((p) => {
        const first = dates.get(p.id)?.[0];
        return { id: p.id, lat: p.location!.lat, lng: p.location!.lng, color: first ? DAY_KIND[kindOfDate.get(first)!].hex : UNSCHEDULED_HEX, title: p.name };
      });
    return [...sights, ...food];
  }, [day, doc, places, dates, kindOfDate, showFood, foodPlaces]);

  const sel: Place | null = selected ? places.get(selected) ?? null : null;
  useAiContext(mapPage(doc, { day, selected: sel, me, showFood }));

  const setDay = (date: string) => {
    setSelected(null);
    router.replace(date ? `${pathname}?zi=${date}` : pathname ?? '');
  };

  const locate = async () => {
    setLocating(true);
    try {
      setMe(await currentPosition());
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setLocating(false);
    }
  };

  const nearFood = me ? nearest(me, foodPlaces, 3) : [];

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Hartă</h1>
      <div className="flex items-center gap-2">
        <select value={day?.date ?? ''} onChange={(e) => setDay(e.target.value)} className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-neutral-300 bg-white px-2 text-sm" aria-label="Filtru">
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={showFood}
          onClick={() => setShowFood((v) => !v)}
          className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border text-sm font-semibold ${showFood ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-neutral-300'}`}
        >
          <UtensilsCrossed size={15} /> Mâncare
        </button>
        <button
          type="button"
          onClick={() => void locate()}
          className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border text-sm font-semibold ${me ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-neutral-300'}`}
        >
          <LocateFixed size={15} /> {locating ? 'Se caută…' : 'Locația mea'}
        </button>
      </div>
      {day && <p className="text-xs text-neutral-500">Liniile arată ordinea zilei, nu traseul.</p>}

      <div className="relative h-[62vh] min-h-[360px] rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 isolate">
        <MapView markers={markers} base={doc.trip.base} line={!!day} fit={fit} onSelect={setSelected} user={me} />

        {sel && (
          <div className="absolute inset-x-2 bottom-2 z-[500] rounded-2xl bg-white shadow-lg border border-neutral-200 p-3">
            <button type="button" onClick={() => setSelected(null)} aria-label="Închide" className="absolute right-2 top-2 w-8 h-8 inline-flex items-center justify-center text-neutral-500">
              <X size={18} />
            </button>
            <div className="flex gap-3 pr-8">
              <PlacePhoto place={sel} thumb className="w-16 h-16 rounded-xl flex-shrink-0" sizes="64px" />
              <div className="min-w-0">
                <p className="font-bold leading-tight">{sel.name}</p>
                <p className="text-xs text-neutral-500">
                  {sel.kind === 'food'
                    ? [priceOf(sel) && `o masă ${priceOf(sel)}`, sel.location?.address].filter(Boolean).join(' · ')
                    : (dates.get(sel.id) ?? []).map(formatDateShort).join(', ') || 'neprogramat'}
                  {me && sel.location && ` · ${kmText(nearest(me, [sel], 1)[0]?.km ?? 0)} de tine`}
                </p>
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

      {nearFood.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-orange-900 mb-1">Mâncare aproape de tine</p>
          <ul className="divide-y divide-orange-100">
            {nearFood.map(({ place, km }) => (
              <li key={place.id}>
                <button type="button" onClick={() => setSelected(place.id)} className="w-full flex items-center justify-between gap-2 min-h-[44px] text-left text-sm">
                  <span className="font-semibold">{place.name}</span>
                  <span className="text-xs text-orange-900 tabular-nums">
                    {kmText(km)}
                    {priceOf(place) && ` · ${priceOf(place)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: FOOD_HEX }} />
          mâncare
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          tu
        </span>
      </div>
    </div>
  );
}
