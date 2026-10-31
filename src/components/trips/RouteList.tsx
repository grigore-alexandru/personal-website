'use client';

import { ArrowDownRight, ArrowUpLeft, Bus, Car, ChevronDown, CircleDot, Footprints, Plane, Ship, TrainFront, TramFront } from 'lucide-react';
import type { Item, Route, RouteMode } from '@/lib/trips/schema';
import { navigationTarget } from '@/lib/trips/time';
import { useTrip } from './TripProvider';
import { minutesText } from './helpers';
import { NavigateButtons, NoteText } from './ui';

const MODE: Record<RouteMode, { label: string; Icon: typeof Bus; tint: string }> = {
  walk: { label: 'Pe jos', Icon: Footprints, tint: 'bg-neutral-100 text-neutral-700' },
  bart: { label: 'BART', Icon: TrainFront, tint: 'bg-sky-100 text-sky-800' },
  caltrain: { label: 'Caltrain', Icon: TrainFront, tint: 'bg-red-100 text-red-800' },
  muni: { label: 'Muni', Icon: TramFront, tint: 'bg-orange-100 text-orange-800' },
  bus: { label: 'Autobuz', Icon: Bus, tint: 'bg-emerald-100 text-emerald-800' },
  ferry: { label: 'Feribot', Icon: Ship, tint: 'bg-blue-100 text-blue-800' },
  car: { label: 'Mașină', Icon: Car, tint: 'bg-neutral-100 text-neutral-700' },
  plane: { label: 'Avion', Icon: Plane, tint: 'bg-neutral-100 text-neutral-700' },
  other: { label: '', Icon: CircleDot, tint: 'bg-neutral-100 text-neutral-500' },
};

/** Step-by-step way there / back for one activity, each route a dropdown (closed by default unless `open`). */
export function RouteList({ item, open = false }: { item: Item; open?: boolean }) {
  const routes = item.routes ?? [];
  if (routes.length === 0) return null;
  const sorted = [...routes].sort((a, b) => (a.direction === b.direction ? 0 : a.direction === 'to' ? -1 : 1));
  return (
    <div className="space-y-2">
      {sorted.map((r) => (
        <RouteDetails key={r.id} route={r} open={open} />
      ))}
    </div>
  );
}

function RouteDetails({ route, open }: { route: Route; open: boolean }) {
  const { doc, places } = useTrip();
  const total = route.steps.reduce((s, st) => s + (st.durationMin ?? 0), 0);
  const Dir = route.direction === 'to' ? ArrowDownRight : ArrowUpLeft;
  const dest = route.destination === 'base' ? doc.trip.base : route.destination ? (places.get(route.destination) ? navigationTarget(places.get(route.destination)!) : null) : null;

  return (
    <details open={open} className="group rounded-xl border border-neutral-200 bg-neutral-50 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-start gap-2 p-3 list-none">
        <Dir size={16} className="mt-0.5 flex-shrink-0 text-neutral-500" />
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-neutral-500">{route.direction === 'to' ? 'Dus' : 'Întors'}</span>
          <span className="block text-sm font-semibold leading-snug">{route.title}</span>
          {(route.summary || total > 0) && <span className="block text-xs text-neutral-600">{route.summary ?? `~${minutesText(total)}`}</span>}
        </span>
        <ChevronDown size={18} className="mt-1 flex-shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3 space-y-3">
        <ol className="space-y-2">
          {route.steps.map((st, i) => {
            const m = MODE[st.mode];
            return (
              <li key={i} className="flex gap-2.5">
                <span className={`mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${m.tint}`} title={m.label || undefined}>
                  <m.Icon size={15} />
                </span>
                <span className="flex-1 text-sm leading-snug text-neutral-800">
                  <span className="whitespace-pre-wrap">{st.text}</span>
                  {st.durationMin != null && st.durationMin > 0 && <span className="ml-1 text-xs text-neutral-500 whitespace-nowrap">· {minutesText(st.durationMin)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        {route.notes && <NoteText text={route.notes} />}
        {dest && <NavigateButtons target={dest} size="sm" />}
      </div>
    </details>
  );
}
