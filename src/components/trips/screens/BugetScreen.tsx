'use client';

import Link from 'next/link';
import { CATEGORY_LABEL, formatMoney, missingPriceLines, tripBudget, type Money } from '@/lib/trips/money';
import type { CostCategory } from '@/lib/trips/schema';
import { formatDateShort, weekdayName } from '@/lib/trips/time';
import type { CostOwner } from '@/lib/trips/mutations';
import { useTrip } from '../TripProvider';
import { dayHref } from '../tripConfig';
import { AddCostForm } from '../AddCostForm';
import { FoodBudget } from '../FoodBudget';
import { useAiContext } from '../ai';
import { budgetPage } from '../aiPages';
import { AmountInput, Card, CostLineRow, MoneyText, SectionTitle } from '../ui';

const paidOnly = (m: Money): Money => ({ ...m, minCents: m.paidCents, maxCents: m.paidCents, missing: 0 });
const toPay = (m: Money): Money => ({ ...m, minCents: m.minCents - m.paidCents, maxCents: m.maxCents - m.paidCents, missing: 0 });

function Bar({ money, max }: { money: Money; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((money.maxCents / max) * 100)) : 0;
  return (
    <div className="relative h-7 rounded-lg bg-neutral-100 overflow-hidden">
      <div className="absolute inset-y-0 left-0 bg-neutral-300" style={{ width: money.maxCents > 0 ? `${pct}%` : '0%' }} />
      {money.paidCents > 0 && max > 0 && (
        <div className="absolute inset-y-0 left-0 bg-green-600/70" style={{ width: `${Math.round((money.paidCents / max) * 100)}%` }} />
      )}
      <span className="relative z-10 flex h-full items-center px-2 text-xs font-semibold tabular-nums">{formatMoney(money)}</span>
    </div>
  );
}

/** Buget — per category, per day, fixed costs, and every line still waiting for a price. */
export function BugetScreen() {
  const { doc } = useTrip();
  const b = tripBudget(doc);
  useAiContext(budgetPage(doc));
  const missing = missingPriceLines(doc).filter((r) => r.line.category !== 'mancare');
  const missingFood = b.total.missing - missing.length;
  const cats = Object.keys(CATEGORY_LABEL) as CostCategory[];
  const catMax = Math.max(0, ...cats.map((c) => b.byCategory[c].maxCents));
  const dayMax = Math.max(0, ...b.perDay.map((d) => d.money.maxCents));

  const ownerOf = (row: (typeof missing)[number]): CostOwner =>
    row.scope === 'fixed' ? { scope: 'fixed' } : row.scope === 'day' ? { scope: 'day', date: row.owner! } : { scope: 'item', itemId: row.owner! };
  const itemNameOf = (itemId: string) => {
    for (const d of doc.days) {
      const it = d.items.find((i) => i.id === itemId);
      if (it) return it.label ?? doc.places.find((p) => p.id === it.placeId)?.name ?? itemId;
    }
    return itemId;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buget</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-3 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-neutral-500">Total călătorie</p>
          <MoneyText money={b.total} ron className="text-lg font-bold" />
        </Card>
        <Card className="p-3">
          <p className="text-xs font-semibold text-neutral-500">Plătit</p>
          <MoneyText money={paidOnly(b.total)} className="text-lg font-bold" />
        </Card>
        <Card className="p-3">
          <p className="text-xs font-semibold text-neutral-500">De plătit (știut)</p>
          <MoneyText money={toPay(b.total)} className="text-lg font-bold" />
        </Card>
        <Card className="p-3">
          <p className="text-xs font-semibold text-neutral-500">Prețuri lipsă</p>
          <a href="#de-completat" className="text-lg font-bold tabular-nums underline-offset-2 hover:underline">
            {b.total.missing}
          </a>
        </Card>
      </div>

      <section>
        <SectionTitle>Pe categorii</SectionTitle>
        <Card className="p-3 space-y-2">
          {cats.map((c) => (
            <div key={c} className="grid grid-cols-[88px_1fr] items-center gap-2">
              <span className="text-sm font-medium">{CATEGORY_LABEL[c]}</span>
              <Bar money={b.byCategory[c]} max={catMax} />
            </div>
          ))}
        </Card>
      </section>

      <FoodBudget />

      <section>
        <SectionTitle>Pe zile</SectionTitle>
        <Card className="p-2">
          <ul>
            {b.perDay.map((d) => (
              <li key={d.date}>
                <Link href={dayHref(d.date)} className="grid grid-cols-[56px_1fr] sm:grid-cols-[64px_220px_1fr] items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-neutral-50">
                  <span className="text-xs font-semibold text-neutral-600">
                    {weekdayName(d.date).slice(0, 3)} {formatDateShort(d.date)}
                  </span>
                  <span className="hidden sm:block text-sm truncate">{d.title}</span>
                  <Bar money={d.money} max={dayMax} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionTitle>Costuri fixe</SectionTitle>
        <Card className="px-3 py-1">
          {doc.fixedCosts.map((c) => (
            <CostLineRow key={c.id} line={c} owner={{ scope: 'fixed' }} />
          ))}
          <div className="pb-2">
            <AddCostForm owner={{ scope: 'fixed' }} defaultCategory="altele" />
          </div>
        </Card>
      </section>

      <section id="de-completat" className="scroll-mt-20">
        <SectionTitle>De completat ({missing.length})</SectionTitle>
        {missingFood > 0 && (
          <p className="-mt-1 mb-2 text-xs text-neutral-500">
            Plus {missingFood} {missingFood === 1 ? 'linie' : 'linii'} de mâncare — le completezi în <a href="#mancare" className="underline">secțiunea Mâncare</a>.
          </p>
        )}
        {missing.length === 0 ? (
          <Card className="p-4 text-sm text-neutral-600">Toate costurile au preț.</Card>
        ) : (
          <Card className="divide-y divide-neutral-100">
            {missing.map((row) => (
              <div key={`${row.scope}-${row.owner}-${row.line.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm">{row.line.label}</p>
                  <p className="text-[11px] text-neutral-500">
                    {row.date ? `${weekdayName(row.date).slice(0, 3)} ${formatDateShort(row.date)}` : 'fix'}
                    {row.scope === 'item' && ` · ${itemNameOf(row.owner!)}`} · {CATEGORY_LABEL[row.line.category]}
                  </p>
                </div>
                <AmountInput line={row.line} owner={ownerOf(row)} placeholder="sumă" />
              </div>
            ))}
          </Card>
        )}
      </section>

      <p className="text-xs text-neutral-500">
        Sumele sunt per persoană, în USD. Intervalele se scriu „24-30”; „+” înseamnă că mai sunt costuri fără preț.
      </p>
    </div>
  );
}
