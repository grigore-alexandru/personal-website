'use client';

import Link from 'next/link';
import { dayBudget, formatMoney, tripBudget } from '@/lib/trips/money';
import { formatDateShort, weekdayName, weekdayOf } from '@/lib/trips/time';
import { useTrip } from '../TripProvider';
import { DAY_KIND, dayHref } from '../tripConfig';
import { coverOf, doneCount, photoPlace, ticketsToBuy } from '../helpers';
import { MoneyText, PlacePhoto, StatusChip, WarningDot } from '../ui';

const WEEK_HEAD = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'];

/** Zile — the whole period: 7-column calendar from 640 px, a list below. */
export function ZileScreen() {
  const { doc, warnings, today, places } = useTrip();
  const total = tripBudget(doc).total;
  const confirmed = doc.days.filter((d) => d.status === 'confirmed').length;
  const tickets = ticketsToBuy(doc).length;

  const lead = (weekdayOf(doc.days[0].date) + 6) % 7; // Monday-first offset
  const cells: (typeof doc.days[number] | null)[] = [...Array(lead).fill(null), ...doc.days];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h1 className="text-2xl font-bold">Zile</h1>
        <p className="text-sm text-neutral-600">
          <MoneyText money={total} ron className="font-semibold text-neutral-900" /> · {confirmed} din {doc.days.length} zile confirmate ·{' '}
          {tickets === 1 ? '1 bilet de luat' : `${tickets} bilete de luat`}
        </p>
      </div>

      {/* ≥ 640 px: calendar grid */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEK_HEAD.map((w) => (
            <div key={w} className="text-xs font-semibold text-neutral-500 px-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const k = DAY_KIND[day.kind];
            const money = dayBudget(day).total;
            const { done, total: n } = doneCount(day);
            const isToday = day.date === today;
            return (
              <Link
                key={day.date}
                href={dayHref(day.date)}
                className={`relative flex flex-col gap-1 min-h-[96px] rounded-xl p-2 ${k.tint} border ${
                  day.status === 'draft' ? 'border-dashed border-neutral-400' : 'border-neutral-300'
                } ${isToday ? 'ring-2 ring-black ring-offset-1' : ''} hover:border-black`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold">{formatDateShort(day.date)}</span>
                  <WarningDot warnings={warnings[day.date]} />
                </div>
                <span className="text-[13px] leading-tight font-semibold line-clamp-2">{day.title}</span>
                <div className="mt-auto flex items-center justify-between gap-1 text-[11px] text-neutral-600">
                  <span className="tabular-nums">{formatMoney(money, { compact: true })}</span>
                  <span className="tabular-nums">
                    {done}/{n}
                  </span>
                </div>
                {day.status === 'draft' && <span className="text-[10px] font-semibold text-neutral-500">propus</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* < 640 px: one row per day */}
      <ul className="sm:hidden space-y-2">
        {doc.days.map((day, i) => {
          const k = DAY_KIND[day.kind];
          const isToday = day.date === today;
          return (
            <li key={day.date}>
              <Link
                href={dayHref(day.date)}
                className={`flex items-center gap-3 rounded-xl bg-white p-2.5 border ${
                  day.status === 'draft' ? 'border-dashed border-neutral-400' : 'border-neutral-300'
                } ${isToday ? 'ring-2 ring-black' : ''}`}
              >
                <div className={`flex flex-col items-center justify-center w-11 flex-shrink-0 rounded-lg py-1 ${k.tint}`}>
                  <span className="text-lg font-bold leading-none">{Number(day.date.slice(8))}</span>
                  <span className="text-[10px] font-semibold text-neutral-600">{weekdayName(day.date).slice(0, 3)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight line-clamp-2">{day.title}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StatusChip status={day.status} />
                    <WarningDot warnings={warnings[day.date]} />
                    <span className="text-[11px] text-neutral-500">Ziua {i + 1}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-neutral-800">{formatMoney(dayBudget(day).total, { compact: true })}</span>
                <PlacePhoto place={photoPlace(coverOf(day, places), doc)} thumb className="w-12 h-12 rounded-lg flex-shrink-0" sizes="48px" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600" aria-label="Legendă">
        {Object.values(DAY_KIND).map((k) => (
          <span key={k.label} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${k.dot}`} />
            {k.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-3 rounded border border-dashed border-neutral-500" /> propus
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> problemă
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> atenție
        </span>
      </div>
    </div>
  );
}
