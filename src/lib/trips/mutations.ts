// src/lib/trips/mutations.ts — every UI edit is a pure function (doc) => doc.
// Pure functions make conflict handling trivial: on a conflict, reload and re-apply the same function.
import type { CostLine, Day, Item, TripDoc } from "./schema";

export type Mutation = (doc: TripDoc) => TripDoc;

export class MutationError extends Error {}

const clone = (doc: TripDoc): TripDoc => structuredClone(doc);

export function findItem(doc: TripDoc, itemId: string): { day: Day; index: number; item: Item } | null {
  for (const day of doc.days) {
    const index = day.items.findIndex((i) => i.id === itemId);
    if (index >= 0) return { day, index, item: day.items[index] };
  }
  return null;
}

function mustDay(doc: TripDoc, date: string): Day {
  const day = doc.days.find((d) => d.date === date);
  if (!day) throw new MutationError(`Ziua ${date} nu există.`);
  return day;
}

function mustItem(doc: TripDoc, itemId: string) {
  const found = findItem(doc, itemId);
  if (!found) throw new MutationError("Elementul nu mai există (poate a fost mutat de pe alt dispozitiv).");
  return found;
}

const clampPos = (pos: number | undefined, len: number) => Math.max(0, Math.min(pos ?? len, len));

export const setItemDone = (itemId: string, done: boolean): Mutation => (doc) => {
  const next = clone(doc);
  mustItem(next, itemId).item.done = done;
  return next;
};

export const updateItem = (itemId: string, patch: Partial<Pick<Item, "start" | "durationMin" | "label" | "notes" | "fixed">>): Mutation => (doc) => {
  const next = clone(doc);
  Object.assign(mustItem(next, itemId).item, patch);
  return next;
};

/** Move within a day (reorder) or to another day. position = index in the target day after removal. */
export const moveItem = (itemId: string, toDate: string, position?: number): Mutation => (doc) => {
  const next = clone(doc);
  const { day, index, item } = mustItem(next, itemId);
  const target = mustDay(next, toDate);
  day.items.splice(index, 1);
  target.items.splice(clampPos(position, target.items.length), 0, item);
  return next;
};

let counter = 0;
export function newItemId(date: string, placeId: string, taken: Set<string>): string {
  const base = `i-${date.slice(5).replace("-", "")}-${placeId}`;
  if (!taken.has(base)) return base;
  let id = base;
  while (taken.has(id)) id = `${base}-${++counter}`;
  return id;
}

/** Schedule a place on a day; copies the place's cost template into the new item. */
export const addPlaceToDay = (placeId: string, date: string, position?: number): Mutation => (doc) => {
  const next = clone(doc);
  const place = next.places.find((p) => p.id === placeId);
  if (!place) throw new MutationError("Locul nu există.");
  const day = mustDay(next, date);
  const taken = new Set(next.days.flatMap((d) => d.items.map((i) => i.id)));
  const item: Item = {
    id: newItemId(date, placeId, taken),
    placeId,
    label: null,
    kind: "visit",
    start: null,
    durationMin: null,
    fixed: false,
    done: false,
    costs: structuredClone(place.costTemplate),
    notes: null,
    calendarEventId: null,
    routes: [],
  };
  day.items.splice(clampPos(position, day.items.length), 0, item);
  return next;
};

/** Unschedule (the place itself is never deleted from the app). */
export const removeItem = (itemId: string): Mutation => (doc) => {
  const next = clone(doc);
  const { day, index } = mustItem(next, itemId);
  day.items.splice(index, 1);
  return next;
};

export const setDayStatus = (date: string, status: Day["status"]): Mutation => (doc) => {
  const next = clone(doc);
  mustDay(next, date).status = status;
  return next;
};

export type CostOwner = { scope: "fixed" } | { scope: "day"; date: string } | { scope: "item"; itemId: string };

function costArray(doc: TripDoc, owner: CostOwner): CostLine[] {
  if (owner.scope === "fixed") return doc.fixedCosts;
  if (owner.scope === "day") return mustDay(doc, owner.date).costs;
  return mustItem(doc, owner.itemId).item.costs;
}

export const updateCost = (owner: CostOwner, costId: string, patch: Partial<Omit<CostLine, "id">>): Mutation => (doc) => {
  const next = clone(doc);
  const line = costArray(next, owner).find((c) => c.id === costId);
  if (!line) throw new MutationError("Costul nu mai există.");
  Object.assign(line, patch, patch.amountCents !== undefined || patch.amountMaxCents !== undefined ? { source: "manual" } : {});
  return next;
};

export const setBookingStatus = (placeId: string, status: "todo" | "booked" | "not-needed", reference?: string): Mutation => (doc) => {
  const next = clone(doc);
  const place = next.places.find((p) => p.id === placeId);
  if (!place?.booking) throw new MutationError("Locul nu are rezervare.");
  place.booking.status = status;
  if (reference !== undefined) place.booking.reference = reference;
  return next;
};

/** Dollar text from an <input> → integer cents ("47.95" → 4795, "" → null). */
export function parseDollars(text: string): number | null {
  const t = text.trim().replace(",", ".").replace(/^\$/, "");
  if (t === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) throw new MutationError("Sumă invalidă — scrie de exemplu 47.95");
  const [whole, frac = ""] = t.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

// ---------------------------------------------------------------------------
// Additions for the app screens (not in the original plan; same pure style).
// ---------------------------------------------------------------------------

/** ASCII slug from a label ("Feribot Sausalito → SF" → "feribot-sausalito-sf"). */
export function slugify(text: string): string {
  const s = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "cost";
}

/** Add a cost line to fixed costs, a day or an item; the id is derived from the label and made unique. */
export const addCost = (owner: CostOwner, line: Omit<CostLine, "id">): Mutation => (doc) => {
  const next = clone(doc);
  const arr = costArray(next, owner);
  const taken = new Set(arr.map((c) => c.id));
  const base = slugify(line.label);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  arr.push({ ...line, id });
  return next;
};

export const removeCost = (owner: CostOwner, costId: string): Mutation => (doc) => {
  const next = clone(doc);
  const arr = costArray(next, owner);
  const i = arr.findIndex((c) => c.id === costId);
  if (i < 0) throw new MutationError("Costul nu mai există.");
  arr.splice(i, 1);
  return next;
};

export const updateDay = (date: string, patch: Partial<Pick<Day, "status" | "title" | "notes" | "kind" | "coverPlaceId">>): Mutation => (doc) => {
  const next = clone(doc);
  Object.assign(mustDay(next, date), patch);
  return next;
};

/** "23" → [2300, null]; "23-30" / "23–30" → [2300, 3000]; "" → [null, null]. */
export function parseDollarRange(text: string): [number | null, number | null] {
  const parts = text.split(/\s*[-–]\s*/).filter((p, i) => i === 0 || p !== "");
  if (parts.length > 2) throw new MutationError("Sumă invalidă — scrie de exemplu 47.95 sau 24-30");
  const min = parseDollars(parts[0] ?? "");
  const max = parts.length === 2 ? parseDollars(parts[1]) : null;
  if (max != null && (min == null || max < min)) throw new MutationError("Intervalul trebuie să fie de la mic la mare, de exemplu 24-30");
  return [min, max === min ? null : max];
}

/** Fill every day-level food line that has no price yet with the same daily estimate (prices already set stay). */
export const setFoodEstimate = (amountCents: number, amountMaxCents: number | null): Mutation => (doc) => {
  const next = clone(doc);
  for (const day of next.days)
    for (const c of day.costs)
      if (c.category === "mancare" && c.amountCents == null) Object.assign(c, { amountCents, amountMaxCents, source: "manual" as const });
  return next;
};

/** Swap two days' plans (title, kind, status, cover, notes, costs, items); the dates stay where they are. */
export const swapDays = (a: string, b: string): Mutation => (doc) => {
  const next = clone(doc);
  const da = mustDay(next, a);
  const db = mustDay(next, b);
  if (a === b) return next;
  const { date: _a, ...planA } = da;
  const { date: _b, ...planB } = db;
  Object.assign(da, planB);
  Object.assign(db, planA);
  return next;
};
