// Pure helpers for the Program calendar: which days are visible, how long an item lasts on the grid,
// and how overlapping items share a column (Google Calendar style).
import type { Day, Item, Place, TripDoc } from '../../../lib/trips/schema';
import { itemMinutes, legKey } from '../../../lib/trips/validate';
import { toMinutes, weekdayOf } from '../../../lib/trips/time';
import { regionMinutes, regionOf, REGIONS, type Region } from '../../../lib/trips/regions';

export type View = 'day' | '3day' | 'week' | 'agenda';
export const VIEW_STEP: Record<View, number> = { day: 1, '3day': 3, week: 7, agenda: 1 };
export const SNAP_MIN = 15;
export const DAY_MIN = 24 * 60;

export const snap = (min: number, step = SNAP_MIN) => Math.round(min / step) * step;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Minutes an item occupies on the grid: its duration, the place's minimum, else a sensible default. */
export function gridMinutes(item: Item, places: Map<string, Place>): { minutes: number; estimated: boolean } {
  const known = itemMinutes(item, places);
  if (known != null && known > 0) return { minutes: known, estimated: item.durationMin == null };
  if (item.kind === 'deadline') return { minutes: 0, estimated: false };
  return { minutes: item.kind === 'transport' ? 30 : 60, estimated: true };
}

/** Days shown for a view, starting from `anchor` (week views start on Monday), always inside the trip. */
export function visibleDates(doc: TripDoc, view: View, anchor: string): string[] {
  const dates = doc.days.map((d) => d.date);
  let i = Math.max(0, dates.indexOf(anchor));
  if (view === 'day') return [dates[i]];
  if (view === 'week') {
    const back = (weekdayOf(dates[i]) + 6) % 7; // Monday = 0
    const from = i - back;
    const out: string[] = [];
    for (let k = from; k < from + 7; k++) if (k >= 0 && k < dates.length) out.push(dates[k]);
    return out;
  }
  i = Math.min(i, Math.max(0, dates.length - 3));
  return dates.slice(i, i + 3);
}

/** Anchor after moving one page forward (+1) or back (-1); weeks jump to the neighbouring Monday-first week. */
export function shiftAnchor(doc: TripDoc, view: View, anchor: string, dir: 1 | -1): string {
  const dates = doc.days.map((d) => d.date);
  const shown = visibleDates(doc, view, anchor);
  const first = dates.indexOf(shown[0]);
  const last = dates.indexOf(shown[shown.length - 1]);
  const next = view === 'week' ? (dir === 1 ? last + 1 : first - 1) : first + dir * VIEW_STEP[view];
  return dates[clamp(next, 0, dates.length - 1)];
}

export type Placed = { id: string; start: number; end: number; col: number; cols: number };

/** Side-by-side columns for overlapping items: clusters of overlaps share the width equally. */
export function layoutColumns(events: { id: string; start: number; end: number }[]): Map<string, Placed> {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const out = new Map<string, Placed>();
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  let colEnds: number[] = [];
  const flush = () => {
    const cols = colEnds.length || 1;
    for (const p of cluster) out.set(p.id, { ...p, cols });
    cluster = [];
    colEnds = [];
  };
  for (const e of sorted) {
    const end = Math.max(e.end, e.start + 20); // very short items still need room for a label
    if (cluster.length && e.start >= clusterEnd) flush();
    let col = colEnds.findIndex((c) => c <= e.start);
    if (col < 0) {
      col = colEnds.length;
      colEnds.push(end);
    } else colEnds[col] = end;
    cluster.push({ id: e.id, start: e.start, end, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return out;
}

export type Travel = { minutes: number; label: string; when: 'before' | 'after'; tight: boolean };

const routeMinutes = (r: Item['routes'][number]) => r.steps.reduce((s, st) => s + (st.durationMin ?? 0), 0);

/**
 * Travel to draw around a timed item. Its own routes win: a way there goes before it; a way back, or one that ends at
 * home (the SFO landing), goes after it. Without routes: the computed transit leg from the previous stop (or home), else
 * the typical time between two parts of the Bay Area. `tight` = it doesn't fit after whatever ends before.
 */
export function travelAround(day: Day, item: Item, doc: TripDoc): Travel[] {
  const own = item.routes
    .filter((r) => routeMinutes(r) > 0)
    .map((r): Travel => ({ minutes: routeMinutes(r), label: r.summary ?? r.title, when: r.direction === 'from' || r.destination === 'base' ? 'after' : 'before', tight: false }));
  if (own.some((t) => t.when === 'before') || !item.placeId || !item.start) return own;
  const places = new Map(doc.places.map((p) => [p.id, p]));
  const here = places.get(item.placeId);
  if (!here) return own;
  const start = toMinutes(item.start);
  const endOf = (i: Item) => toMinutes(i.start!) + (itemMinutes(i, places) ?? 0);
  const before = day.items.filter((i) => i.id !== item.id && i.placeId && i.start && i.kind !== 'deadline' && toMinutes(i.start) <= start);
  const prev = before.length ? before.reduce((best, i) => (endOf(i) > endOf(best) ? i : best)) : null;
  const prevPlace = prev ? places.get(prev.placeId!) : undefined;
  const from = prevPlace ? prevPlace.id : doc.trip.base ? 'base' : null;
  if (!from) return own;
  const fromRegion: Region = prevPlace ? regionOf(prevPlace) : 'sf'; // home is in the city
  const leg = doc.legs[legKey(from, here.id)];
  const minutes = leg?.minutes ?? regionMinutes(fromRegion, regionOf(here));
  if (!minutes) return own;
  const label = leg?.summary ?? `drum estimat din ${prevPlace ? REGIONS[fromRegion].short : 'casă'}`;
  return [...own, { minutes, label, when: 'before', tight: !!prev && start - endOf(prev) < minutes }];
}
