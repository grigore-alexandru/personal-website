// src/lib/trips/money.ts — budget math. All amounts are integer cents (no floats anywhere).
import type { CostCategory, CostLine, Day, TripDoc } from "./schema";

export type Money = {
  minCents: number; // sum of known amounts (lower end of ranges)
  maxCents: number; // sum with upper end of ranges
  missing: number; // number of lines without a price
  paidCents: number; // sum of known amounts marked paid
  lines: number;
};

export const ZERO: Money = { minCents: 0, maxCents: 0, missing: 0, paidCents: 0, lines: 0 };

export const CATEGORY_LABEL: Record<CostCategory, string> = {
  bilet: "Bilete",
  transport: "Transport",
  mancare: "Mâncare",
  cazare: "Cazare",
  zbor: "Zbor",
  altele: "Altele",
};

export function lineMoney(c: CostLine): Money {
  const min = (c.amountCents ?? 0) * c.qty;
  const max = (c.amountMaxCents ?? c.amountCents ?? 0) * c.qty;
  return { minCents: min, maxCents: max, missing: c.amountCents == null ? 1 : 0, paidCents: c.paid ? min : 0, lines: 1 };
}

export function addMoney(a: Money, b: Money): Money {
  return {
    minCents: a.minCents + b.minCents,
    maxCents: a.maxCents + b.maxCents,
    missing: a.missing + b.missing,
    paidCents: a.paidCents + b.paidCents,
    lines: a.lines + b.lines,
  };
}

export const sumLines = (lines: CostLine[]): Money => lines.map(lineMoney).reduce(addMoney, ZERO);

export function dayLines(day: Day): CostLine[] {
  return [...day.costs, ...day.items.flatMap((i) => i.costs)];
}

export function byCategory(lines: CostLine[]): Record<CostCategory, Money> {
  const out = Object.fromEntries(Object.keys(CATEGORY_LABEL).map((k) => [k, ZERO])) as Record<CostCategory, Money>;
  for (const l of lines) out[l.category] = addMoney(out[l.category], lineMoney(l));
  return out;
}

export function dayBudget(day: Day) {
  const lines = dayLines(day);
  return { total: sumLines(lines), byCategory: byCategory(lines) };
}

export function tripBudget(doc: TripDoc) {
  const perDay = doc.days.map((d) => ({ date: d.date, title: d.title, status: d.status, kind: d.kind, money: dayBudget(d).total }));
  const daysTotal = perDay.map((d) => d.money).reduce(addMoney, ZERO);
  const fixed = sumLines(doc.fixedCosts);
  const allLines = [...doc.days.flatMap(dayLines), ...doc.fixedCosts];
  return { perDay, daysTotal, fixed, total: addMoney(daysTotal, fixed), byCategory: byCategory(allLines) };
}

/** Lines still waiting for a price — the "De completat" list Claude works through. */
export function missingPriceLines(doc: TripDoc) {
  const rows: { scope: "fixed" | "day" | "item"; owner: string | null; date: string | null; line: CostLine }[] = [];
  for (const c of doc.fixedCosts) if (c.amountCents == null) rows.push({ scope: "fixed", owner: null, date: null, line: c });
  for (const d of doc.days) {
    for (const c of d.costs) if (c.amountCents == null) rows.push({ scope: "day", owner: d.date, date: d.date, line: c });
    for (const i of d.items) for (const c of i.costs) if (c.amountCents == null) rows.push({ scope: "item", owner: i.id, date: d.date, line: c });
  }
  return rows;
}

const usd = (cents: number, compact: boolean) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: compact || cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(compact ? Math.round(cents / 100) : cents / 100);

/**
 * "$47.95", "$24–$30", "$48+" (some prices missing), "—" (nothing known yet).
 * compact = whole dollars, for calendar cells.
 */
export function formatMoney(m: Money, opts: { compact?: boolean } = {}): string {
  const compact = opts.compact ?? false;
  if (m.lines === 0) return "$0";
  if (m.minCents === 0 && m.maxCents === 0 && m.missing > 0) return "—";
  const base = m.minCents === m.maxCents ? usd(m.minCents, compact) : `${usd(m.minCents, compact)}–${usd(m.maxCents, compact)}`;
  return m.missing > 0 ? `${base}+` : base;
}

/** Optional RON hint, only when trip.fxRonPerUsd is set. */
export function formatRon(cents: number, fxRonPerUsd: number | null): string | null {
  if (fxRonPerUsd == null) return null;
  const lei = Math.round((cents / 100) * fxRonPerUsd);
  return `≈ ${new Intl.NumberFormat("ro-RO").format(lei)} lei`;
}
