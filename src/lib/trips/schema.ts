// src/lib/trips/schema.ts — single source of truth for the trip document shape.
import { z } from "zod";

export const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug");
export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
export const HHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm");
const Cents = z.number().int().nonnegative();
const Weekday = z.number().int().min(0).max(6); // 0 = Sunday (JS getUTCDay, Postgres dow)

export const GeoPoint = z.object({
  name: z.string().nullable(),
  address: z.string().nullable(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  googlePlaceId: z.string().nullable(),
});

export const CostCategory = z.enum(["bilet", "transport", "mancare", "cazare", "zbor", "altele"]);
export const CostLine = z
  .object({
    id: Slug,
    label: z.string().min(1),
    category: CostCategory,
    amountCents: Cents.nullable(), // null = price unknown ("de completat")
    amountMaxCents: Cents.nullable(), // set only for ranges, e.g. IMAX $24–30
    qty: z.number().int().min(1),
    paid: z.boolean(),
    source: z.enum(["note", "claude", "manual"]),
    verifiedAt: ISODate.nullable(),
    note: z.string().nullable(),
  })
  .refine((c) => c.amountMaxCents == null || (c.amountCents != null && c.amountMaxCents >= c.amountCents), {
    message: "amountMaxCents needs amountCents and must be >= it",
  });

export const Hours = z.object({
  text: z.string(),
  open: HHmm.nullable(),
  close: HHmm.nullable(),
  closedWeekdays: z.array(Weekday),
});

export const Booking = z.object({
  required: z.boolean(),
  status: z.enum(["todo", "booked", "not-needed"]),
  url: z.string().url().nullable(),
  bookBy: ISODate.nullable(),
  reference: z.string().nullable(),
  note: z.string().nullable(),
});

export const Photo = z.object({
  source: z.string(), // Obsidian attachment file name
  path: z.string().nullable(), // storage path in bucket trip-media once uploaded
  alt: z.string(),
});

export const Duration = z.object({
  text: z.string(),
  minMinutes: z.number().int().positive().nullable(),
  maxMinutes: z.number().int().positive().nullable(),
});

export const PlaceKind = z.enum(["zone", "attraction", "museum", "daytrip", "event", "nature"]);
export const Area = z.enum(["sf", "marin", "east-bay", "peninsula", "south-bay", "coast", "napa", "bay"]);

export const Place = z.object({
  id: Slug,
  name: z.string().min(1),
  kind: PlaceKind,
  area: Area,
  parentId: Slug.nullable(),
  priority: z.enum(["must", "nice"]).nullable(),
  location: GeoPoint.nullable(), // where the place is (map pin)
  meetingPoint: GeoPoint.nullable(), // where you actually go first (Pier 33, Ferry Building)
  photos: z.array(Photo),
  duration: Duration.nullable(),
  hours: Hours.nullable(),
  transport: z.string().nullable(),
  booking: Booking.nullable(),
  costTemplate: z.array(CostLine), // copied into an item when the place is scheduled
  links: z.array(z.object({ label: z.string(), url: z.string().url() })),
  notes: z.string().nullable(), // verbatim from Obsidian
  source: z.object({ obsidianHeading: z.string() }),
});

export const ItemKind = z.enum(["visit", "transport", "deadline", "note"]);
export const Item = z
  .object({
    id: Slug,
    placeId: Slug.nullable(),
    label: z.string().nullable(),
    kind: ItemKind,
    start: HHmm.nullable(),
    durationMin: z.number().int().nonnegative().nullable(),
    fixed: z.boolean(), // fixed time (ferry departure) — never auto-moved
    done: z.boolean(),
    costs: z.array(CostLine),
    notes: z.string().nullable(),
    calendarEventId: z.string().nullable(),
  })
  .refine((i) => i.placeId != null || (i.label != null && i.label.length > 0), { message: "item needs placeId or label" });

export const DayKind = z.enum(["city", "daytrip", "valley", "travel"]);
export const Day = z.object({
  date: ISODate,
  status: z.enum(["draft", "confirmed"]),
  kind: DayKind,
  title: z.string().min(1),
  coverPlaceId: Slug.nullable(),
  notes: z.string().nullable(),
  costs: z.array(CostLine), // day-level costs: local transport, food, transfers
  items: z.array(Item),
});

export const Leg = z.object({
  from: z.string(),
  to: z.string(),
  mode: z.enum(["transit", "walking", "driving", "bicycling"]),
  minutes: z.number().int().nonnegative(),
  meters: z.number().int().nonnegative().nullable(),
  departAt: z.string().nullable(),
  computedAt: z.string(),
  summary: z.string().nullable(),
});

export const Trip = z.object({
  id: Slug,
  title: z.string(),
  timezone: z.literal("America/Los_Angeles"),
  currency: z.literal("USD"),
  startDate: ISODate,
  endDate: ISODate,
  base: GeoPoint.nullable(), // accommodation; null until known
  arrival: z.object({ date: ISODate, time: HHmm.nullable(), airport: z.string() }),
  departure: z.object({ date: ISODate, time: HHmm.nullable(), airport: z.string() }),
  fxRonPerUsd: z.number().positive().nullable(),
  notes: z.string().nullable(),
});

export const TripDoc = z
  .object({
    version: z.literal(1),
    trip: Trip,
    places: z.array(Place),
    days: z.array(Day),
    fixedCosts: z.array(CostLine),
    legs: z.record(z.string(), Leg),
    meta: z.object({
      createdAt: z.string(),
      updatedBy: z.string().nullable(),
      source: z.string().nullable(),
      geocodedAt: z.string().nullable(),
    }),
  })
  .superRefine((doc, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    const placeIds = new Set<string>();
    for (const p of doc.places) {
      if (placeIds.has(p.id)) issue(`duplicate place id ${p.id}`);
      placeIds.add(p.id);
    }
    for (const p of doc.places) if (p.parentId && !placeIds.has(p.parentId)) issue(`place ${p.id}: unknown parent ${p.parentId}`);

    // exactly one day per date, sorted, from startDate to endDate
    const expected: string[] = [];
    for (let t = Date.parse(doc.trip.startDate + "T00:00:00Z"); t <= Date.parse(doc.trip.endDate + "T00:00:00Z"); t += 86_400_000) {
      expected.push(new Date(t).toISOString().slice(0, 10));
    }
    const actual = doc.days.map((d) => d.date);
    if (actual.join() !== expected.join()) issue("days must cover startDate..endDate exactly once, in order");

    const itemIds = new Set<string>();
    for (const d of doc.days) {
      if (d.coverPlaceId && !placeIds.has(d.coverPlaceId)) issue(`day ${d.date}: unknown cover ${d.coverPlaceId}`);
      uniqueCostIds(d.costs, `day ${d.date}`, issue);
      for (const i of d.items) {
        if (itemIds.has(i.id)) issue(`duplicate item id ${i.id}`);
        itemIds.add(i.id);
        if (i.placeId && !placeIds.has(i.placeId)) issue(`item ${i.id}: unknown place ${i.placeId}`);
        uniqueCostIds(i.costs, `item ${i.id}`, issue);
      }
    }
    uniqueCostIds(doc.fixedCosts, "fixedCosts", issue);
    for (const [key, leg] of Object.entries(doc.legs)) {
      if (key !== `${leg.from}>${leg.to}>${leg.mode}`) issue(`leg key ${key} does not match its content`);
    }
    if (JSON.stringify(doc).length > 1_000_000) issue("document larger than 1 MB");
  });

function uniqueCostIds(lines: { id: string }[], where: string, issue: (m: string) => void) {
  const seen = new Set<string>();
  for (const c of lines) {
    if (seen.has(c.id)) issue(`${where}: duplicate cost id ${c.id}`);
    seen.add(c.id);
  }
}

export type TripDoc = z.infer<typeof TripDoc>;
export type Place = z.infer<typeof Place>;
export type Day = z.infer<typeof Day>;
export type Item = z.infer<typeof Item>;
export type CostLine = z.infer<typeof CostLine>;
export type CostCategory = z.infer<typeof CostCategory>;
export type GeoPoint = z.infer<typeof GeoPoint>;
export type Leg = z.infer<typeof Leg>;
