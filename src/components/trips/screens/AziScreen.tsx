'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Day, Item } from '@/lib/trips/schema';
import { dayBudget, formatMoney, missingPriceLines, tripBudget } from '@/lib/trips/money';
import { dayNumber, daysUntil, formatDateRo, navigationTarget, toMinutes, tripPhase } from '@/lib/trips/time';
import { itemName, itemMinutes, legKey } from '@/lib/trips/validate';
import { setItemDone } from '@/lib/trips/mutations';
import { useTrip } from '../TripProvider';
import { BASE, dayHref } from '../tripConfig';
import { coverOf, minutesText, photoPlace, ticketsToBuy } from '../helpers';
import { useAiContext } from '../ai';
import { aziPage } from '../aiPages';
import { Card, MoneyText, NavigateButtons, NoteText, PlacePhoto, StatusChip, WarningList } from '../ui';

/** Azi — what matters right now, in San Francisco time. */
export function AziScreen() {
  const { doc, today } = useTrip();
  useAiContext(aziPage(doc, today));
  const phase = tripPhase(doc, today);
  if (phase === 'before') return <Before />;
  if (phase === 'after') return <After />;
  return <During />;
}

function DayCard({ day }: { day: Day }) {
  const { doc, places } = useTrip();
  return (
    <Link href={dayHref(day.date)} className="block rounded-2xl overflow-hidden border border-neutral-200 bg-white">
      <PlacePhoto place={photoPlace(coverOf(day, places), doc)} className="aspect-[16/9] w-full" sizes="(min-width: 960px) 928px, 100vw" />
      <div className="p-4">
        <p className="text-sm text-neutral-500">
          Ziua {dayNumber(doc, day.date)} · {formatDateRo(day.date)}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-lg font-bold leading-tight">{day.title}</p>
          <StatusChip status={day.status} />
        </div>
      </div>
    </Link>
  );
}

function Shortcut({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 min-h-[52px] text-sm font-semibold">
      <span>
        {label} <span className="tabular-nums text-neutral-500">({count})</span>
      </span>
      <ChevronRight size={18} className="text-neutral-400" />
    </Link>
  );
}

function Before() {
  const { doc, today } = useTrip();
  const n = daysUntil(today, doc.trip.startDate);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{n === 1 ? 'Pleci mâine' : `Pleci în ${n} zile`}</h1>
      <DayCard day={doc.days[0]} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Shortcut href={`${BASE}/bilete`} label="Bilete de luat" count={ticketsToBuy(doc).length} />
        <Shortcut href={`${BASE}/buget#de-completat`} label="Prețuri lipsă" count={missingPriceLines(doc).length} />
      </div>
      <Link href={`${BASE}/zile`} className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2">
        Vezi toate cele {doc.days.length} zile
      </Link>
    </div>
  );
}

function After() {
  const { doc } = useTrip();
  const t = tripBudget(doc).total;
  const daysDone = doc.days.filter((d) => d.items.length > 0 && d.items.every((i) => i.done)).length;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Călătoria s-a terminat</h1>
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-4">
          <p className="text-xs font-semibold text-neutral-500">Plătit</p>
          <p className="text-xl font-bold tabular-nums">{formatMoney({ ...t, minCents: t.paidCents, maxCents: t.paidCents, missing: 0 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-neutral-500">Zile parcurse</p>
          <p className="text-xl font-bold tabular-nums">
            {daysDone} din {doc.days.length}
          </p>
        </Card>
      </div>
      <Link href={`${BASE}/buget`} className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2">
        Vezi bugetul
      </Link>
    </div>
  );
}

/** First not-done item starting ≥ now − 15 min, else the first not-done item. */
function nextItem(day: Day, nowMin: number): Item | undefined {
  const open = day.items.filter((i) => !i.done);
  return open.find((i) => i.start != null && toMinutes(i.start) >= nowMin - 15) ?? open[0];
}

function During() {
  const { doc, places, today, nowMin, warnings, mutate } = useTrip();
  const index = doc.days.findIndex((d) => d.date === today);
  const day = doc.days[index];
  const tomorrow = doc.days[index + 1];
  const next = nextItem(day, nowMin);
  const place = next?.placeId ? places.get(next.placeId) : undefined;
  const prevStop = next ? day.items.slice(0, day.items.indexOf(next)).reverse().find((i) => i.placeId) : undefined;
  const legFrom = prevStop?.placeId ?? (doc.trip.base ? 'base' : null);
  const leg = next?.placeId && legFrom ? doc.legs[legKey(legFrom, next.placeId)] : undefined;
  const len = next ? itemMinutes(next, places) : null;
  const rest = day.items.filter((i) => i !== next);
  const firstTomorrow = tomorrow?.items[0];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-neutral-500">
          Ziua {index + 1} din {doc.days.length} · {formatDateRo(day.date)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Link href={dayHref(day.date)} className="text-2xl font-bold leading-tight">
            {day.title}
          </Link>
          <StatusChip status={day.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Costul zilei: <MoneyText money={dayBudget(day).total} ron className="font-semibold text-neutral-900" />
        </p>
      </div>

      <WarningList warnings={warnings[day.date] ?? []} />

      {next ? (
        <Card className="overflow-hidden">
          <div className="flex gap-3 p-4">
            {place && <PlacePhoto place={place} thumb className="w-20 h-20 rounded-xl flex-shrink-0" sizes="80px" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Urmează</p>
              <p className="text-xl font-bold leading-tight">
                {next.start && <span className="tabular-nums mr-2">{next.start}</span>}
                {itemName(next, places)}
              </p>
              <p className="mt-0.5 text-sm text-neutral-600">
                {[len != null ? minutesText(len) : place?.duration?.text, leg ? `${leg.minutes} min de drum${prevStop ? '' : ' de la cazare'}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          {(next.notes || place?.notes) && <NoteText text={(next.notes ?? place?.notes)!} className="px-4 pb-3" />}
          <div className="px-4 pb-4 space-y-3">
            <NavigateButtons target={place ? navigationTarget(place) : null} />
            <label className="inline-flex items-center gap-2 min-h-[44px] font-semibold cursor-pointer select-none">
              <input type="checkbox" aria-label={`Făcut: ${itemName(next, places)}`} checked={next.done} onChange={(e) => mutate(setItemDone(next.id, e.target.checked))} className="w-6 h-6 accent-black" />
              Făcut
            </label>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <p className="font-semibold">{day.items.length ? 'Gata pe azi — totul e făcut.' : 'Zi liberă — adaugă un loc.'}</p>
        </Card>
      )}

      {rest.length > 0 && (
        <Card className="divide-y divide-neutral-100">
          {rest.map((i) => (
            <label key={i.id} className="flex items-center gap-3 px-4 min-h-[48px] cursor-pointer">
              <input type="checkbox" aria-label={`Făcut: ${itemName(i, places)}`} checked={i.done} onChange={(e) => mutate(setItemDone(i.id, e.target.checked))} className="w-5 h-5 accent-black" />
              <span className="w-11 text-sm font-semibold tabular-nums text-neutral-600">{i.start ?? '—'}</span>
              <span className={`flex-1 text-sm ${i.done ? 'line-through text-neutral-400' : ''}`}>{itemName(i, places)}</span>
            </label>
          ))}
        </Card>
      )}

      {tomorrow && (
        <Link href={dayHref(tomorrow.date)} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
          <PlacePhoto place={photoPlace(coverOf(tomorrow, places), doc)} thumb className="w-14 h-14 rounded-xl flex-shrink-0" sizes="56px" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Mâine</p>
            <p className="font-semibold leading-tight truncate">{tomorrow.title}</p>
            {firstTomorrow && (
              <p className="text-xs text-neutral-500 truncate">
                Prima: {firstTomorrow.start ? `${firstTomorrow.start} · ` : ''}
                {itemName(firstTomorrow, places)}
              </p>
            )}
          </div>
          <ChevronRight size={18} className="text-neutral-400" />
        </Link>
      )}
    </div>
  );
}
