'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney, sumLines } from '@/lib/trips/money';
import { formatDateShort, weekdayName } from '@/lib/trips/time';
import { MutationError, parseDollarRange, setFoodEstimate, updateCost } from '@/lib/trips/mutations';
import { useTrip } from './TripProvider';
import { dayHref, placeHref } from './tripConfig';
import { AmountInput, Card, MoneyText, SectionTitle } from './ui';

/**
 * Buget → Mâncare: food on its own, one row per day. Day-level food lines are edited inline;
 * "Estimare pe zi" fills every day that has no price yet. Food places (kind "food") are listed
 * with the price from the note, as a reference.
 */
export function FoodBudget() {
  const { doc, mutate, toast } = useTrip();
  const [estimate, setEstimate] = useState('26-40');

  const rows = doc.days.map((d) => {
    const dayFood = d.costs.filter((c) => c.category === 'mancare');
    const itemFood = d.items.flatMap((i) => i.costs.filter((c) => c.category === 'mancare'));
    return { day: d, dayFood, money: sumLines([...dayFood, ...itemFood]) };
  });
  const total = sumLines(rows.flatMap((r) => [...r.dayFood, ...r.day.items.flatMap((i) => i.costs.filter((c) => c.category === 'mancare'))]));
  const unpriced = rows.filter((r) => r.dayFood.some((c) => c.amountCents == null)).length;
  const foodPlaces = doc.places.filter((p) => p.kind === 'food');

  const apply = () => {
    try {
      const [min, max] = parseDollarRange(estimate);
      if (min == null) return toast('Scrie o sumă pe zi, de exemplu 26-40.', 'error');
      if (mutate(setFoodEstimate(min, max))) toast(`Estimare pusă la ${unpriced} ${unpriced === 1 ? 'zi' : 'zile'}`);
    } catch (e) {
      toast(e instanceof MutationError ? e.message : String(e), 'error');
    }
  };

  return (
    <section id="mancare" className="scroll-mt-20">
      <SectionTitle right={<MoneyText money={total} className="text-sm font-bold" />}>Mâncare</SectionTitle>
      <Card className="p-3 space-y-3">
        <div className="rounded-xl bg-orange-50 p-3 text-sm text-orange-950">
          <p>
            O masă sănătoasă, fast-casual, costă în jur de <b>$13–20</b> (sweetgreen, MIXT, Chipotle, Whole Foods hot bar). Două mese pe zi ≈ <b>$26–40</b>.
          </p>
          {unpriced > 0 && (
            <form
              className="mt-2 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                apply();
              }}
            >
              <label className="text-xs font-semibold">
                Estimare pe zi ($)
                <input
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  inputMode="decimal"
                  className="ml-2 w-24 min-h-[40px] rounded-lg border border-orange-300 bg-white px-2 text-sm"
                />
              </label>
              <button type="submit" className="min-h-[40px] px-3 rounded-lg bg-orange-600 text-white text-sm font-semibold">
                Pune la cele {unpriced} zile fără preț
              </button>
            </form>
          )}
        </div>

        <ul className="divide-y divide-neutral-100">
          {rows.map(({ day, dayFood, money }) => (
            <li key={day.date} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
              <Link href={dayHref(day.date)} className="w-[92px] flex-shrink-0">
                <span className="block text-xs font-semibold text-neutral-700">
                  {weekdayName(day.date).slice(0, 3)} {formatDateShort(day.date)}
                </span>
                <span className="block text-[11px] text-neutral-500 truncate">{day.title}</span>
              </Link>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {dayFood.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <AmountInput line={c} owner={{ scope: 'day', date: day.date }} placeholder="pe zi" />
                    <label className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                      <input
                        type="checkbox"
                        aria-label={`Plătit: ${c.label}, ${day.date}`}
                        checked={c.paid}
                        onChange={(e) => mutate(updateCost({ scope: 'day', date: day.date }, c.id, { paid: e.target.checked }))}
                        className="w-4 h-4 accent-black"
                      />
                      plătit
                    </label>
                  </div>
                ))}
              </div>
              <span className="ml-auto text-sm font-semibold tabular-nums">{formatMoney(money)}</span>
            </li>
          ))}
        </ul>

        {foodPlaces.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-500 mb-1">Locuri de mâncare</p>
            <ul className="flex flex-wrap gap-1.5">
              {foodPlaces.map((p) => (
                <li key={p.id}>
                  <Link href={placeHref(p.id)} className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-full bg-orange-100 text-orange-900 text-xs font-semibold">
                    {p.name}
                    {p.notes?.match(/\$\d+–\d+/)?.[0] && <span className="font-normal">· {p.notes.match(/\$\d+–\d+/)![0]}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </section>
  );
}
