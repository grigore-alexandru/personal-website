// Small derived views over the trip document, shared by the screens.
import type { Day, Place, TripDoc } from '@/lib/trips/schema';
import { formatDateShort, weekdayName } from '@/lib/trips/time';

/** placeId → dates it is scheduled on, in trip order. */
export function scheduledDates(doc: TripDoc): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const d of doc.days)
    for (const i of d.items)
      if (i.placeId) {
        const list = out.get(i.placeId) ?? [];
        if (!list.includes(d.date)) list.push(d.date);
        out.set(i.placeId, list);
      }
  return out;
}

/** Places with at least one item marked done. */
export function donePlaceIds(doc: TripDoc): Set<string> {
  return new Set(doc.days.flatMap((d) => d.items.filter((i) => i.done && i.placeId).map((i) => i.placeId as string)));
}

/** Booking-required places not booked yet, sorted by first scheduled date. */
export function ticketsToBuy(doc: TripDoc) {
  const dates = scheduledDates(doc);
  return doc.places
    .filter((p) => p.booking?.required && p.booking.status === 'todo')
    .map((p) => ({ place: p, dates: dates.get(p.id) ?? [] }))
    .sort((a, b) => (a.dates[0] ?? '9999').localeCompare(b.dates[0] ?? '9999'));
}

export const doneCount = (day: Day) => ({ done: day.items.filter((i) => i.done).length, total: day.items.length });

/** "mar 3 nov" — the option label in "Mută în altă zi". */
export const dayOptionLabel = (day: Day) => `${weekdayName(day.date).slice(0, 3)} ${formatDateShort(day.date)} — ${day.title}`;

export const coverOf = (day: Day, places: Map<string, Place>): Place | undefined => {
  if (day.coverPlaceId) return places.get(day.coverPlaceId);
  const first = day.items.find((i) => i.placeId);
  return first?.placeId ? places.get(first.placeId) : undefined;
};

/** Cover photo owner: the cover place, or (for a parent without photos, e.g. Silicon Valley) its first child with one. */
export function photoPlace(place: Place | undefined, doc: TripDoc): Place | undefined {
  if (!place || place.photos.length > 0) return place;
  return doc.places.find((p) => p.parentId === place.id && p.photos.length > 0) ?? place;
}

export function minutesText(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
