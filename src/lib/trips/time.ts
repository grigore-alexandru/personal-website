// src/lib/trips/time.ts — dates, times and links. Trip dates are plain "YYYY-MM-DD" strings
// interpreted in the trip time zone; never build a Date from them in the device's zone.
import type { GeoPoint, Place, TripDoc } from "./schema";

const WEEKDAY_RO = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
const WEEKDAY_RO_HABIT = ["duminica", "lunea", "marțea", "miercurea", "joia", "vinerea", "sâmbăta"]; // "închis miercurea"
const MONTH_RO = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

const parts = (date: string) => date.split("-").map(Number) as [number, number, number];

/** 0 = Sunday … 6 = Saturday, same convention as Postgres `dow` and hours.closedWeekdays. */
export function weekdayOf(date: string): number {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const weekdayName = (date: string) => WEEKDAY_RO[weekdayOf(date)];
export const weekdayHabit = (weekday: number) => WEEKDAY_RO_HABIT[weekday];

/** "marți, 3 noiembrie" */
export function formatDateRo(date: string): string {
  const [, m, d] = parts(date);
  return `${weekdayName(date)}, ${d} ${MONTH_RO[m - 1]}`;
}

const MONTH_RO_SHORT = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];

/** "3 nov" for calendar cells (the standard abbreviation, not the first three letters of "noiembrie") */
export function formatDateShort(date: string): string {
  const [, m, d] = parts(date);
  return `${d} ${MONTH_RO_SHORT[m - 1]}`;
}

/** Today's date in the trip time zone, e.g. "2026-11-03", whatever the phone's zone is. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Minutes since midnight in the trip time zone. */
export function nowMinutesIn(timeZone: string, now: Date = new Date()): number {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export function tripPhase(doc: TripDoc, today: string): "before" | "during" | "after" {
  if (today < doc.trip.startDate) return "before";
  if (today > doc.trip.endDate) return "after";
  return "during";
}

/** 1-based day number ("Ziua 3 din 18"). */
export function dayNumber(doc: TripDoc, date: string): number {
  return doc.days.findIndex((d) => d.date === date) + 1;
}

export function daysUntil(from: string, to: string): number {
  const [a, b] = [from, to].map((s) => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d); });
  return Math.round((b - a) / 86_400_000);
}

/** Where navigation should go: meeting point (Pier 33, Ferry Building) first, else the place. */
export const navigationTarget = (p: Place): GeoPoint | null => p.meetingPoint ?? p.location;

/** Google Maps directions deep link — opens the Maps app on the phone, no API key needed. */
export function mapsDirectionsUrl(dest: GeoPoint, mode: "transit" | "walking" | "driving" | "bicycling" = "transit"): string {
  const q = new URLSearchParams({ api: "1", destination: `${dest.lat},${dest.lng}`, travelmode: mode });
  if (dest.googlePlaceId) q.set("destination_place_id", dest.googlePlaceId);
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}
