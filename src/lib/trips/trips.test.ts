// Unit tests for the trip library, run against the real seed: `npm run test:trips`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TripDoc } from "./schema";
import { dayBudget, formatMoney, tripBudget, missingPriceLines } from "./money";
import { validateDay, validateTrip } from "./validate";
import { todayIn, nowMinutesIn, weekdayOf, formatDateRo, mapsDirectionsUrl, tripPhase, dayNumber, navigationTarget } from "./time";
import { addPlaceToDay, moveItem, parseDollars, removeItem, setItemDone, updateCost, updateItem } from "./mutations";
import { commit, ConflictError, createCommitQueue, type TripStore, type Snapshot } from "./sync";

const seed = TripDoc.parse(JSON.parse(readFileSync(new URL("../../../data/trips/sf-2026.seed.json", import.meta.url), "utf8")));
const day = (doc: TripDoc, date: string) => doc.days.find((d) => d.date === date)!;

test("seed parses and has 18 days, Stanford confirmed on day 1", () => {
  assert.equal(seed.days.length, 18);
  assert.equal(seed.days[0].date, "2026-11-02");
  assert.equal(seed.days[0].status, "confirmed");
  assert.ok(seed.days[0].items.some((i) => i.placeId === "stanford"));
  assert.equal(seed.days.filter((d) => d.items.some((i) => i.placeId === "stanford")).length, 4);
  assert.equal(seed.days.filter((d) => d.status === "confirmed").map((d) => d.date).join(), "2026-11-02,2026-11-19");
});

test("every place from the note is scheduled exactly where expected", () => {
  const scheduled = new Set(seed.days.flatMap((d) => d.items.map((i) => i.placeId).filter(Boolean)));
  const unscheduled = seed.places.filter((p) => !scheduled.has(p.id)).map((p) => p.id);
  assert.deepEqual(unscheduled, ["silicon-valley"]); // parent only; its stops are scheduled
});

test("weekdays", () => {
  assert.equal(weekdayOf("2026-11-02"), 1); // Monday
  assert.equal(weekdayOf("2026-11-04"), 3); // Wednesday
  assert.equal(weekdayOf("2026-11-19"), 4); // Thursday
  assert.equal(formatDateRo("2026-11-03"), "marți, 3 noiembrie");
});

test("seed has no blocking errors (SFMOMA not on Wednesday, CHM not Mon/Tue)", () => {
  const all = Object.values(validateTrip(seed)).flat();
  assert.deepEqual(all.filter((w) => w.severity === "error"), []);
  const booking = Object.entries(validateTrip(seed)).flatMap(([d, ws]) => ws.filter((w) => w.code === "BOOKING_TODO").map(() => d));
  assert.deepEqual(booking, ["2026-11-03", "2026-11-07", "2026-11-17"]); // Alcatraz, bike, IMAX
});

test("closed-day and last-ferry rules fire", () => {
  const sfmomaWed = moveItem("i-1105-sfmoma", "2026-11-04")(seed);
  assert.ok(validateDay(day(sfmomaWed, "2026-11-04"), sfmomaWed).some((w) => w.code === "CLOSED_DAY" && w.message.includes("miercurea")));
  const chmMon = moveItem("i-1113-computer-history-museum", "2026-11-09")(seed);
  assert.ok(validateDay(day(chmMon, "2026-11-09"), chmMon).some((w) => w.code === "CLOSED_DAY" && w.message.includes("lunea")));
  const late = updateItem("i-1107-angel-island", { durationMin: 420 })(seed); // 10:05 + 7h = 17:05
  const ws = validateDay(day(late, "2026-11-07"), late);
  assert.ok(ws.some((w) => w.code === "AFTER_DEADLINE" && w.message.includes("17:05") && w.message.includes("16:55")));
});

test("budget per activity, per day and per trip (integer cents)", () => {
  const d3 = dayBudget(day(seed, "2026-11-03")).total;
  assert.deepEqual([d3.minCents, d3.maxCents, d3.missing], [4795, 4795, 2]);
  assert.equal(formatMoney(d3), "$47.95+");
  assert.equal(formatMoney(d3, { compact: true }), "$48+");
  const d17 = dayBudget(day(seed, "2026-11-17")).total;
  assert.equal(formatMoney(d17), "$24–$30+");
  assert.equal(formatMoney(dayBudget(day(seed, "2026-11-08")).total), "—");
  const t = tripBudget(seed);
  assert.equal(t.daysTotal.minCents, 4795 + 2300 + 1650 + 2400 + 2600);
  assert.equal(t.daysTotal.maxCents, 4795 + 3000 + 1650 + 3000 + 2600);
  assert.equal(t.total.minCents, t.daysTotal.minCents + 1500);
  assert.equal(t.byCategory.bilet.minCents, 4795 + 2300 + 1650 + 2400);
  assert.equal(missingPriceLines(seed).length, t.total.missing);
  const paid = updateCost({ scope: "item", itemId: "i-1103-alcatraz" }, "bilet", { paid: true })(seed);
  assert.equal(tripBudget(paid).total.paidCents, 4795);
});

test("mutations are pure and keep the document valid", () => {
  const before = JSON.stringify(seed);
  const a = addPlaceToDay("alcatraz", "2026-11-18")(seed);
  assert.equal(JSON.stringify(seed), before);
  const added = day(a, "2026-11-18").items.at(-1)!;
  assert.equal(added.id, "i-1118-alcatraz");
  assert.equal(added.costs[0].amountCents, 4795);
  assert.ok(TripDoc.safeParse(a).success);
  const again = addPlaceToDay("alcatraz", "2026-11-18")(a);
  assert.notEqual(day(again, "2026-11-18").items.at(-1)!.id, "i-1118-alcatraz");
  assert.ok(TripDoc.safeParse(again).success);
  const done = setItemDone("i-1102-stanford", true)(seed);
  assert.equal(day(done, "2026-11-02").items[1].done, true);
  const removed = removeItem("i-1117-imax")(seed);
  assert.equal(day(removed, "2026-11-17").items.length, 2);
  assert.equal(parseDollars("47.95"), 4795);
  assert.equal(parseDollars("$26"), 2600);
  assert.equal(parseDollars("3,5"), 350);
  assert.equal(parseDollars(""), null);
  assert.throws(() => parseDollars("abc"));
});

test("today is computed in San Francisco time, whatever the phone's zone", () => {
  const tz = "America/Los_Angeles";
  // 08:30 on 3 Nov in Bucharest = 22:30 on 2 Nov in San Francisco (PST, UTC-8 after 1 Nov)
  assert.equal(todayIn(tz, new Date("2026-11-03T06:30:00Z")), "2026-11-02");
  assert.equal(nowMinutesIn(tz, new Date("2026-11-03T06:30:00Z")), 22 * 60 + 30);
  assert.equal(tripPhase(seed, "2026-10-31"), "before");
  assert.equal(tripPhase(seed, "2026-11-10"), "during");
  assert.equal(dayNumber(seed, "2026-11-19"), 18);
});

test("navigation goes to the meeting point (Pier 33) when there is one", () => {
  const alcatraz = seed.places.find((p) => p.id === "alcatraz")!;
  const url = mapsDirectionsUrl(navigationTarget(alcatraz)!);
  assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1&destination=37.8065473%2C-122.4049057&travelmode=transit"));
});

test("commit replays the mutation after a conflict", async () => {
  let stored: Snapshot = { doc: seed, hash: "h1", updatedAt: "t1" };
  let calls = 0;
  const store: TripStore = {
    load: async () => stored,
    loadHash: async () => stored.hash,
    save: async (_id, expected, doc) => {
      calls++;
      if (calls === 1) {
        // someone else (Claude) saved first
        stored = { doc: setItemDone("i-1102-stanford", true)(stored.doc), hash: "h2", updatedAt: "t2" };
      }
      if (expected !== stored.hash) throw new ConflictError("trip_conflict");
      stored = { doc, hash: "h3", updatedAt: "t3" };
      return { hash: "h3", updatedAt: "t3" };
    },
  };
  const result = await commit(store, "sf-2026", { doc: seed, hash: "h1", updatedAt: "t1" }, setItemDone("i-1103-alcatraz", true));
  assert.equal(result.hash, "h3");
  assert.equal(day(result.doc, "2026-11-02").items[1].done, true); // other device's change kept
  assert.equal(day(result.doc, "2026-11-03").items[0].done, true); // our change applied
  const queue = createCommitQueue();
  const order: number[] = [];
  await Promise.all([queue(async () => { await new Promise((r) => setTimeout(r, 20)); order.push(1); }), queue(async () => { order.push(2); })]);
  assert.deepEqual(order, [1, 2]);
});

test("app additions: add/remove cost, update day, dollar ranges", async () => {
  const { addCost, removeCost, updateDay, parseDollarRange } = await import("./mutations");
  const owner = { scope: "day" as const, date: "2026-11-03" };
  const a = addCost(owner, { label: "Muni prin oraș", category: "transport", amountCents: 500, amountMaxCents: null, qty: 1, paid: false, source: "manual", verifiedAt: null, note: null })(seed);
  const added = day(a, "2026-11-03").costs.at(-1)!;
  assert.equal(added.id, "muni-prin-oras");
  assert.ok(TripDoc.safeParse(a).success);
  const b = addCost(owner, { ...added, label: "Muni prin oraș" })(a);
  assert.equal(day(b, "2026-11-03").costs.at(-1)!.id, "muni-prin-oras-2");
  assert.equal(day(removeCost(owner, "muni-prin-oras")(a), "2026-11-03").costs.length, 2);
  assert.equal(day(updateDay("2026-11-05", { status: "confirmed", notes: "ok" })(seed), "2026-11-05").status, "confirmed");
  assert.deepEqual(parseDollarRange("24-30"), [2400, 3000]);
  assert.deepEqual(parseDollarRange("$23 – 30"), [2300, 3000]);
  assert.deepEqual(parseDollarRange("47.95"), [4795, null]);
  assert.deepEqual(parseDollarRange(""), [null, null]);
  assert.throws(() => parseDollarRange("30-24"));
});
