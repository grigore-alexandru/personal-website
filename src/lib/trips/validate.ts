// src/lib/trips/validate.ts — warnings shown on day cards and in the day view. Pure, no I/O.
import type { Day, Item, Place, TripDoc } from "./schema";
import { dayBudget } from "./money";
import { fromMinutes, toMinutes, weekdayHabit, weekdayOf } from "./time";

export type WarningCode =
  | "CLOSED_DAY"
  | "OUTSIDE_HOURS"
  | "AFTER_DEADLINE"
  | "TIME_OVERLAP"
  | "TIME_ORDER"
  | "BOOKING_TODO"
  | "DAY_TOO_FULL"
  | "MISSING_PRICES"
  | "NO_LOCATION";

export type Warning = { code: WarningCode; severity: "error" | "warn" | "info"; itemId?: string; message: string };

export const legKey = (from: string, to: string, mode = "transit") => `${from}>${to}>${mode}`;

const DAY_LOAD_LIMIT_MIN = 13 * 60;

export function itemName(item: Item, places: Map<string, Place>): string {
  return item.label ?? (item.placeId ? places.get(item.placeId)?.name ?? item.placeId : "—");
}

/** Planned length of an item: explicit durationMin, else the place's minimum duration. */
export function itemMinutes(item: Item, places: Map<string, Place>): number | null {
  if (item.durationMin != null) return item.durationMin;
  const p = item.placeId ? places.get(item.placeId) : undefined;
  return p?.duration?.minMinutes ?? null;
}

/** Transit minutes between consecutive place items (and from base to the first), when computed. */
export function dayTravelMinutes(day: Day, doc: TripDoc): { minutes: number; known: number; expected: number } {
  const stops = day.items.filter((i) => i.placeId).map((i) => i.placeId as string);
  const chain = doc.trip.base ? ["base", ...stops, "base"] : stops;
  let minutes = 0;
  let known = 0;
  for (let k = 0; k + 1 < chain.length; k++) {
    const leg = doc.legs[legKey(chain[k], chain[k + 1])];
    if (leg) { minutes += leg.minutes; known++; }
  }
  return { minutes, known, expected: Math.max(chain.length - 1, 0) };
}

export function validateDay(day: Day, doc: TripDoc): Warning[] {
  const places = new Map(doc.places.map((p) => [p.id, p]));
  const out: Warning[] = [];
  const wd = weekdayOf(day.date);

  for (const item of day.items) {
    const p = item.placeId ? places.get(item.placeId) : undefined;
    const name = itemName(item, places);
    if (p?.hours?.closedWeekdays.includes(wd)) {
      out.push({ code: "CLOSED_DAY", severity: "error", itemId: item.id, message: `${name} e închis ${weekdayHabit(wd)}.` });
    }
    const len = itemMinutes(item, places);
    if (p?.hours?.open && p.hours.close && item.start) {
      const s = toMinutes(item.start);
      const e = s + (len ?? 0);
      if (s < toMinutes(p.hours.open) || e > toMinutes(p.hours.close)) {
        out.push({ code: "OUTSIDE_HOURS", severity: "warn", itemId: item.id, message: `${name} e deschis ${p.hours.open}–${p.hours.close}.` });
      }
    }
    if (p?.booking?.required && p.booking.status === "todo") {
      out.push({ code: "BOOKING_TODO", severity: "warn", itemId: item.id, message: `${name}: rezervarea nu e făcută încă.` });
    }
    if (p && !p.location && !p.meetingPoint) {
      out.push({ code: "NO_LOCATION", severity: "info", itemId: item.id, message: `${name} nu are încă locație pe hartă.` });
    }
  }

  // time logic only for items that have a start time
  const timed = day.items
    .map((item, position) => ({ item, position, start: item.start ? toMinutes(item.start) : null, len: itemMinutes(day.items[position], places) }))
    .filter((t): t is typeof t & { start: number } => t.start != null);

  for (const dl of timed.filter((t) => t.item.kind === "deadline")) {
    for (const t of timed) {
      if (t.item.kind === "deadline" || t.position > dl.position || t.len == null) continue;
      if (t.start + t.len > dl.start) {
        out.push({
          code: "AFTER_DEADLINE", severity: "error", itemId: t.item.id,
          message: `${itemName(t.item, places)} se termină la ${fromMinutes(t.start + t.len)}, după „${itemName(dl.item, places)}” (${dl.item.start}).`,
        });
      }
    }
  }

  const nonDeadline = timed.filter((t) => t.item.kind !== "deadline");
  for (let k = 0; k + 1 < nonDeadline.length; k++) {
    const a = nonDeadline[k];
    const b = nonDeadline[k + 1];
    if (b.start < a.start) {
      out.push({ code: "TIME_ORDER", severity: "warn", itemId: b.item.id, message: `${itemName(b.item, places)} (${b.item.start}) e pus după un element care începe mai târziu.` });
    } else if (a.len != null && a.start + a.len > b.start) {
      out.push({ code: "TIME_OVERLAP", severity: "warn", itemId: b.item.id, message: `${itemName(a.item, places)} se suprapune cu ${itemName(b.item, places)}.` });
    }
  }

  const planned = day.items.reduce((s, i) => s + (i.kind === "deadline" ? 0 : itemMinutes(i, places) ?? 0), 0);
  const travel = dayTravelMinutes(day, doc).minutes;
  if (planned + travel > DAY_LOAD_LIMIT_MIN) {
    out.push({ code: "DAY_TOO_FULL", severity: "warn", message: `Ziua are ~${Math.round((planned + travel) / 60)} ore planificate.` });
  }

  const missing = dayBudget(day).total.missing;
  if (missing > 0) {
    out.push({ code: "MISSING_PRICES", severity: "info", message: `${missing} ${missing === 1 ? "cost fără preț" : "costuri fără preț"}.` });
  }
  return out;
}

export function validateTrip(doc: TripDoc): Record<string, Warning[]> {
  return Object.fromEntries(doc.days.map((d) => [d.date, validateDay(d, doc)]));
}
