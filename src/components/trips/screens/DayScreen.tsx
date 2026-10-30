'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Clock, Lock, MoreVertical, Plus, Search, Ticket } from 'lucide-react';
import type { Day, Item, Place } from '@/lib/trips/schema';
import { dayBudget, sumLines } from '@/lib/trips/money';
import { formatDateRo, navigationTarget, weekdayOf } from '@/lib/trips/time';
import { dayTravelMinutes, itemName, legKey } from '@/lib/trips/validate';
import { addPlaceToDay, moveItem, removeCost, removeItem, setDayStatus, setItemDone, updateDay, updateItem } from '@/lib/trips/mutations';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { useTrip } from '../TripProvider';
import { AREA, BASE, DAY_KIND, dayHref, placeHref } from '../tripConfig';
import { coverOf, dayOptionLabel, doneCount, minutesText, photoPlace, scheduledDates } from '../helpers';
import { AddCostForm } from '../AddCostForm';
import { Card, Chip, CostLineRow, ExtLink, MoneyText, NavigateButtons, NoteText, PlacePhoto, SectionTitle, StatusChip, WarningList } from '../ui';

const typingNow = () => {
  const el = document.activeElement;
  if (!el) return false;
  if (el.tagName === 'INPUT') return (el as HTMLInputElement).type !== 'checkbox';
  return el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
};

/** Ziua — one day in detail, with every light edit. */
export function DayScreen({ date }: { date: string }) {
  const { doc, places, warnings, mutate } = useTrip();
  const router = useRouter();
  const index = doc.days.findIndex((d) => d.date === date);
  const day = doc.days[index];
  const prev = doc.days[index - 1];
  const next = doc.days[index + 1];
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typingNow() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft' && prev) router.push(dayHref(prev.date));
      if (e.key === 'ArrowRight' && next) router.push(dayHref(next.date));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, router]);

  if (!day) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold">Ziua {date} nu face parte din călătorie.</p>
        <Link href={`${BASE}/zile`} className="mt-3 inline-block underline">
          Înapoi la Zile
        </Link>
      </div>
    );
  }

  const money = dayBudget(day).total;
  const travel = dayTravelMinutes(day, doc);
  const { done, total } = doneCount(day);
  const dayWarnings = warnings[day.date] ?? [];
  const cover = photoPlace(coverOf(day, places), doc);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        {prev ? (
          <Link href={dayHref(prev.date)} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-neutral-700">
            <ChevronLeft size={18} /> {prev.date.slice(8)}.11
          </Link>
        ) : (
          <span />
        )}
        <Link href={`${BASE}/zile`} className="text-sm text-neutral-500 underline underline-offset-2">
          Toate zilele
        </Link>
        {next ? (
          <Link href={dayHref(next.date)} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-neutral-700">
            {next.date.slice(8)}.11 <ChevronRight size={18} />
          </Link>
        ) : (
          <span />
        )}
      </div>

      <PlacePhoto place={cover} className="aspect-video w-full rounded-2xl" sizes="(min-width: 960px) 928px, 100vw" />

      <div>
        <p className="text-sm text-neutral-500">
          Ziua {index + 1} din {doc.days.length} · {formatDateRo(day.date)} · {DAY_KIND[day.kind].label}
        </p>
        <h1 className="text-2xl font-bold leading-tight mt-0.5">{day.title}</h1>
        <div className="mt-3 inline-flex rounded-xl border border-neutral-300 bg-white p-0.5" role="group" aria-label="Starea zilei">
          {(['draft', 'confirmed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={day.status === s}
              onClick={() => day.status !== s && mutate(setDayStatus(day.date, s))}
              className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold ${day.status === s ? 'bg-black text-white' : 'text-neutral-600'}`}
            >
              {s === 'draft' ? 'Propus' : 'Confirmat'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-[11px] font-semibold text-neutral-500">Cost</p>
          <MoneyText money={money} ron className="text-base font-bold" />
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-semibold text-neutral-500">Drum</p>
          {!doc.trip.base ? (
            <p className="text-xs text-neutral-600 leading-snug">Adaugă cazarea ca să vezi timpii de drum.</p>
          ) : travel.known === 0 ? (
            <p className="text-base font-bold text-neutral-400">necalculat</p>
          ) : (
            <p className="text-base font-bold">
              {minutesText(travel.minutes)}
              {travel.known < travel.expected && <span className="text-xs font-normal text-neutral-500"> (parțial)</span>}
            </p>
          )}
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-semibold text-neutral-500">Făcut</p>
          <p className="text-base font-bold tabular-nums">
            {done}/{total}
          </p>
        </Card>
      </div>

      <WarningList warnings={dayWarnings} />

      <section>
        <SectionTitle
          right={
            <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 min-h-[40px] text-sm font-semibold">
              <Plus size={16} /> Adaugă un loc
            </button>
          }
        >
          Program
        </SectionTitle>
        {day.items.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-neutral-600">Zi liberă — adaugă un loc.</p>
          </Card>
        ) : (
          <ol className="space-y-2">
            {day.items.map((item, i) => {
              const prevPlace = day.items.slice(0, i).reverse().find((x) => x.placeId);
              const leg = item.placeId && prevPlace?.placeId ? doc.legs[legKey(prevPlace.placeId, item.placeId)] : undefined;
              return (
                <li key={item.id}>
                  {leg && <p className="pl-14 pb-1 text-xs text-neutral-500">↓ {leg.minutes} min cu transportul{leg.summary ? ` · ${leg.summary}` : ''}</p>}
                  <ItemRow day={day} item={item} index={i} count={day.items.length} />
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section>
        <SectionTitle>Costuri pe zi</SectionTitle>
        <Card className="px-3 py-1">
          {day.costs.length === 0 && <p className="py-3 text-sm text-neutral-500">Niciun cost pe zi.</p>}
          {day.costs.map((c) => (
            <CostLineRow
              key={c.id}
              line={c}
              owner={{ scope: 'day', date: day.date }}
              onRemove={() => mutate(removeCost({ scope: 'day', date: day.date }, c.id))}
            />
          ))}
          <div className="pb-2">
            <AddCostForm owner={{ scope: 'day', date: day.date }} />
          </div>
        </Card>
      </section>

      <DayNotes day={day} />

      <AddPlaceSheet open={adding} onClose={() => setAdding(false)} date={day.date} />
    </div>
  );
}

function ItemRow({ day, item, index, count }: { day: Day; item: Item; index: number; count: number }) {
  const { doc, places, mutate, toast, warnings } = useTrip();
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const place = item.placeId ? places.get(item.placeId) : undefined;
  const name = itemName(item, places);
  const target = place ? navigationTarget(place) : null;
  const cost = sumLines(item.costs);
  const deadline = item.kind === 'deadline';
  // Ticket-to-buy already shows as a chip on the row.
  const itemWarnings = (warnings[day.date] ?? []).filter((w) => w.itemId === item.id && w.severity !== 'info' && w.code !== 'BOOKING_TODO');
  const bookingTodo = place?.booking?.required && place.booking.status === 'todo';
  const durationText = item.durationMin != null ? minutesText(item.durationMin) : place?.duration?.text;
  const closedToday = place?.hours?.closedWeekdays.includes(weekdayOf(day.date));

  return (
    <div
      className={`rounded-2xl border bg-white ${deadline ? 'border-amber-300 bg-amber-50' : 'border-neutral-200'} ${
        itemWarnings.some((w) => w.severity === 'error') ? 'ring-1 ring-red-300' : ''
      } ${item.done ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="w-11 flex-shrink-0 pt-0.5 text-sm font-bold tabular-nums text-neutral-800">{item.start ?? '—'}</div>
        <button type="button" onClick={() => setExpanded((e) => !e)} className="flex-1 min-w-0 text-left" aria-expanded={expanded}>
          <p className={`font-semibold leading-snug ${item.done ? 'line-through' : ''}`}>{name}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {[durationText, place && AREA[place.area], place?.hours && (closedToday || item.start) ? place.hours.text : null].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {item.fixed && (
              <Chip>
                <Lock size={11} /> oră fixă
              </Chip>
            )}
            {deadline && (
              <Chip tone="amber">
                <Clock size={11} /> limită
              </Chip>
            )}
            {bookingTodo && (
              <Chip tone="amber">
                <Ticket size={11} /> bilet de luat
              </Chip>
            )}
            {cost.lines > 0 && (
              <span className="text-xs font-semibold text-neutral-700">
                <MoneyText money={cost} />
              </span>
            )}
            <ChevronDown size={14} className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        <div className="flex flex-col items-end gap-1.5">
          <label className="inline-flex items-center gap-1.5 min-h-[36px] text-xs font-semibold cursor-pointer select-none">
            <input type="checkbox" aria-label={`Făcut: ${name}`} checked={item.done} onChange={(e) => mutate(setItemDone(item.id, e.target.checked))} className="w-5 h-5 accent-black" />
            Făcut
          </label>
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-label="Opțiuni"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {target && (
        <div className="px-3 pb-3 -mt-1 pl-[68px]">
          <NavigateButtons target={target} size="sm" />
        </div>
      )}

      {itemWarnings.length > 0 && <WarningList warnings={itemWarnings} className="px-3 pb-3" />}

      {menu && (
        <div className="border-t border-neutral-100 p-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-neutral-600">
            Mută în altă zi
            <select
              value={day.date}
              onChange={(e) => {
                const to = e.target.value;
                if (to !== day.date && mutate(moveItem(item.id, to))) {
                  toast(`${name} mutat în ${formatDateRo(to)}`);
                  setMenu(false);
                }
              }}
              className="mt-1 block w-full min-h-[44px] rounded-lg border border-neutral-300 px-2 text-sm bg-white"
            >
              {doc.days.map((d) => (
                <option key={d.date} value={d.date}>
                  {dayOptionLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <TimeField item={item} />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => mutate(moveItem(item.id, day.date, index - 1))}
              className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg border border-neutral-300 text-sm font-medium disabled:opacity-40"
            >
              <ArrowUp size={16} /> Sus
            </button>
            <button
              type="button"
              disabled={index === count - 1}
              onClick={() => mutate(moveItem(item.id, day.date, index + 1))}
              className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg border border-neutral-300 text-sm font-medium disabled:opacity-40"
            >
              <ArrowDown size={16} /> Jos
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="ml-auto min-h-[44px] px-3 rounded-lg border border-red-200 text-red-700 text-sm font-medium"
            >
              Scoate din zi
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-neutral-100 p-3 space-y-3">
          {item.notes && <NoteText text={item.notes} />}
          {place?.notes && <NoteText text={place.notes} />}
          {place?.transport && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-0.5">Transport</p>
              <NoteText text={place.transport} />
            </div>
          )}
          {place?.booking?.note && <p className="text-sm text-neutral-700">🎟 {place.booking.note}</p>}
          {place && place.links.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {place.links.map((l) => (
                <li key={l.url}>
                  <ExtLink href={l.url} className="text-sm font-medium underline underline-offset-2">
                    {l.label}
                  </ExtLink>
                </li>
              ))}
            </ul>
          )}
          <div>
            <p className="text-xs font-semibold text-neutral-500">Costuri activitate</p>
            {item.costs.map((c) => (
              <CostLineRow
                key={c.id}
                line={c}
                owner={{ scope: 'item', itemId: item.id }}
                onRemove={() => mutate(removeCost({ scope: 'item', itemId: item.id }, c.id))}
              />
            ))}
            <AddCostForm owner={{ scope: 'item', itemId: item.id }} defaultCategory="bilet" />
          </div>
          {place && (
            <Link href={placeHref(place.id)} className="inline-block text-sm font-semibold underline underline-offset-2">
              Vezi locul
            </Link>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title="Scoate din zi"
        message={`Scoți „${name}” din ${formatDateRo(day.date)}?`}
        note={place ? 'Locul rămâne în listă; îl poți programa din nou oricând.' : undefined}
        confirmLabel="Scoate"
        cancelLabel="Renunță"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          mutate(removeItem(item.id));
        }}
      />
    </div>
  );
}

function TimeField({ item }: { item: Item }) {
  const { mutate } = useTrip();
  const [value, setValue] = useState(item.start ?? '');
  useEffect(() => setValue(item.start ?? ''), [item.start]);
  const save = () => {
    const v = value || null;
    if (v !== item.start) mutate(updateItem(item.id, { start: v }));
  };
  return (
    <label className="text-xs font-semibold text-neutral-600">
      Setează ora
      <div className="mt-1 flex gap-2">
        <input
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 px-2 text-sm bg-white"
        />
        {item.start && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              mutate(updateItem(item.id, { start: null }));
            }}
            className="min-h-[44px] px-3 rounded-lg border border-neutral-300 text-sm"
          >
            Fără oră
          </button>
        )}
      </div>
    </label>
  );
}

function DayNotes({ day }: { day: Day }) {
  const { mutate } = useTrip();
  const [text, setText] = useState(day.notes ?? '');
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(day.notes ?? '');
  }, [day.notes, focused]);
  return (
    <section>
      <SectionTitle>Note</SectionTitle>
      <textarea
        value={text}
        rows={3}
        placeholder="Note pentru ziua asta…"
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const v = text.trim() ? text : null;
          if (v !== day.notes) mutate(updateDay(day.date, { notes: v }));
        }}
        className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm focus:outline-none focus:border-black"
      />
    </section>
  );
}

function AddPlaceSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const { doc, mutate, toast } = useTrip();
  const [q, setQ] = useState('');
  const scheduled = useMemo(() => scheduledDates(doc), [doc]);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const matches = (p: Place) => !q || norm(`${p.name} ${p.location?.name ?? ''}`).includes(norm(q));
  const unscheduled = doc.places.filter((p) => !scheduled.has(p.id) && matches(p));
  const rest = doc.places.filter((p) => scheduled.has(p.id) && matches(p));

  const pick = (p: Place) => {
    if (mutate(addPlaceToDay(p.id, date))) {
      toast(`${p.name} adăugat în ${formatDateRo(date)}`);
      onClose();
      setQ('');
    }
  };

  const row = (p: Place) => (
    <li key={p.id}>
      <button type="button" onClick={() => pick(p)} className="w-full flex items-center gap-3 rounded-xl p-2 text-left hover:bg-neutral-50 min-h-[52px]">
        <PlacePhoto place={p} thumb className="w-10 h-10 rounded-lg flex-shrink-0" sizes="40px" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{p.name}</span>
          <span className="block text-xs text-neutral-500">
            {AREA[p.area]}
            {scheduled.get(p.id)?.length ? ` · programat ${scheduled.get(p.id)!.map((d) => Number(d.slice(8))).join(', ')} nov` : ''}
          </span>
        </span>
        <Plus size={18} className="text-neutral-400" />
      </button>
    </li>
  );

  return (
    <Modal open={open} onClose={onClose} title="Adaugă un loc" subtitle={formatDateRo(date)} size="md">
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Caută un loc"
          className="w-full min-h-[44px] rounded-xl border border-neutral-300 pl-9 pr-3 text-sm"
        />
      </div>
      {unscheduled.length > 0 && (
        <>
          <p className="text-xs font-semibold text-neutral-500 mb-1">Neprogramate</p>
          <ul className="mb-3">{unscheduled.map(row)}</ul>
        </>
      )}
      <p className="text-xs font-semibold text-neutral-500 mb-1">Toate</p>
      <ul>{rest.map(row)}</ul>
      {unscheduled.length + rest.length === 0 && <p className="text-sm text-neutral-500">Niciun loc găsit.</p>}
    </Modal>
  );
}
