'use client';

import Link from '../TripLink';
import { useEffect, useState } from 'react';
import { CalendarDays, Check, Clock, Lock, Unlock, Map as MapIcon, MapPin, Minus, Plus, Ticket, Trash2 } from 'lucide-react';
import type { Mutation } from '@/lib/trips/mutations';
import { findItem, removeItem, scheduleItem, setItemDone, updateItem } from '@/lib/trips/mutations';
import { formatDateRo, fromMinutes, navigationTarget, toMinutes, weekdayOf } from '@/lib/trips/time';
import { itemName } from '@/lib/trips/validate';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTrip } from '../TripProvider';
import { BASE, DAY_KIND, PLACE_KIND, dayHref, placeHref } from '../tripConfig';
import { REGIONS, cityOf, regionMinutes, regionOf } from '@/lib/trips/regions';
import { dayOptionLabel, minutesText } from '../helpers';
import { RouteList } from '../RouteList';
import { Chip, ExtLink, NavigateButtons, NoteText, PlacePhoto, WarningList } from '../ui';
import { DAY_MIN, clamp, gridMinutes } from './calendarLayout';
import { Sheet } from './Sheet';

/** Apply an edit and remember how to undo it (ProgramScreen). */
export type Change = (label: string, m: Mutation) => boolean;

const SHIFTS = [-60, -15, 15, 60];

/** Everything about one activity, with the calendar's edits: time, length, day, done, fixed, remove. */
export function ActivitySheet({ itemId, onClose, change }: { itemId: string | null; onClose: () => void; change: Change }) {
  const { doc, places, warnings } = useTrip();
  const found = itemId ? findItem(doc, itemId) : null;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [timeText, setTimeText] = useState('');
  useEffect(() => setTimeText(found?.item.start ?? ''), [found?.item.start]);

  if (!found) return <Sheet open={false} onClose={onClose} label="Activitate">{null}</Sheet>;
  const { day, item } = found;
  const place = item.placeId ? places.get(item.placeId) : undefined;
  const name = itemName(item, places);
  const { minutes, estimated } = gridMinutes(item, places);
  const start = item.start ? toMinutes(item.start) : null;
  const itemWarnings = (warnings[day.date] ?? []).filter((w) => w.itemId === item.id && w.severity !== 'info');
  const closed = place?.hours?.closedWeekdays.includes(weekdayOf(day.date));

  const setStart = (min: number | null, label: string) => change(label, scheduleItem(item.id, day.date, min == null ? null : fromMinutes(clamp(min, 0, DAY_MIN - 15))));
  const setLength = (len: number) => change(`${name}: ${minutesText(len)}`, updateItem(item.id, { durationMin: len }));

  return (
    <Sheet open onClose={onClose} label={name}>
      {place && place.photos.length > 0 ? (
        <PlacePhoto place={place} className="aspect-[16/9] w-full md:rounded-t-2xl" sizes="(min-width: 768px) 512px, 100vw" />
      ) : (
        <div className="h-6" />
      )}
      <div className="px-5 pt-4 space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <Chip>
              <span className="w-2 h-2 rounded-full" style={{ background: DAY_KIND[day.kind].hex }} /> {formatDateRo(day.date)}
            </Chip>
            {place && <Chip>{PLACE_KIND[place.kind]}</Chip>}
            {item.fixed && (
              <Chip tone="amber">
                <Lock size={10} /> oră fixă
              </Chip>
            )}
            {place?.booking?.required && (
              <Chip tone={place.booking.status === 'booked' ? 'green' : 'amber'}>
                <Ticket size={10} /> {place.kind === 'event' ? (place.booking.status === 'booked' ? 'înregistrat' : 'de înregistrat') : place.booking.status === 'booked' ? 'bilet luat' : 'bilet de luat'}
              </Chip>
            )}
          </div>
          <h2 className={`text-xl font-bold leading-tight pr-8 ${item.done ? 'line-through text-neutral-500' : ''}`}>{name}</h2>
          <p className="mt-1 text-sm text-neutral-600 tabular-nums">
            {start != null ? (item.kind === 'deadline' ? `la ${item.start}` : `${item.start} – ${fromMinutes(start + minutes)}`) : 'fără oră'}
            {item.kind !== 'deadline' && ` · ${estimated ? '~' : ''}${minutesText(minutes)}${estimated ? ' (estimat)' : ''}`}
          </p>
          {place?.hours && (
            <p className={`mt-0.5 text-xs ${closed ? 'text-red-700 font-semibold' : 'text-neutral-500'}`}>
              <Clock size={11} className="inline -mt-0.5 mr-1" />
              {closed ? 'Închis în ziua asta · ' : ''}
              {place.hours.text}
            </p>
          )}
        </div>

        {place && (
          <div className="rounded-2xl p-3" style={{ background: `${REGIONS[regionOf(place)].hex}14`, borderLeft: `4px solid ${REGIONS[regionOf(place)].hex}` }}>
            <p className="flex items-center gap-1.5 text-base font-bold" style={{ color: REGIONS[regionOf(place)].hex }}>
              <MapPin size={16} /> {cityOf(place)}
            </p>
            {place.location?.name && place.location.name !== cityOf(place) && <p className="text-sm font-medium text-neutral-800">{place.location.name}</p>}
            <p className="text-xs text-neutral-600">{place.location?.address ?? 'Adresa exactă nu e cunoscută încă.'}</p>
            {regionOf(place) !== 'sf' && <p className="mt-1 text-xs font-semibold text-neutral-700">~{minutesText(regionMinutes('sf', regionOf(place)))} cu transportul din San Francisco</p>}
          </div>
        )}

        {itemWarnings.length > 0 && <WarningList warnings={itemWarnings} />}

        <NavigateButtons target={place ? navigationTarget(place) : null} />

        <section className="rounded-2xl border border-neutral-200 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-neutral-500 mb-1.5">Ora</p>
            <div className="flex items-center gap-1.5">
              {SHIFTS.slice(0, 2).map((d) => (
                <ShiftButton key={d} delta={d} disabled={start == null} onClick={() => setStart(start! + d, `${name} ${d < 0 ? 'mai devreme' : 'mai târziu'}`)} />
              ))}
              <input
                type="time"
                value={timeText}
                step={300}
                aria-label="Ora de început"
                onChange={(e) => setTimeText(e.target.value)}
                onBlur={() => {
                  if (timeText && timeText !== item.start) setStart(toMinutes(timeText), `${name} la ${timeText}`);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-neutral-300 px-2 text-center text-base font-semibold tabular-nums bg-white"
              />
              {SHIFTS.slice(2).map((d) => (
                <ShiftButton key={d} delta={d} disabled={start == null} onClick={() => setStart(start! + d, `${name} ${d < 0 ? 'mai devreme' : 'mai târziu'}`)} />
              ))}
            </div>
          </div>
          {item.kind !== 'deadline' && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-1.5">Durată</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLength(Math.max(15, minutes - 15))}
                  aria-label="Mai scurt cu 15 minute"
                  className="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-neutral-300"
                >
                  <Minus size={16} />
                </button>
                <span className="flex-1 text-center text-base font-semibold tabular-nums">{minutesText(minutes)}</span>
                <button
                  type="button"
                  onClick={() => setLength(minutes + 15)}
                  aria-label="Mai lung cu 15 minute"
                  className="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-neutral-300"
                >
                  <Plus size={16} />
                </button>
              </div>
              {place?.duration && <p className="mt-1 text-[11px] text-neutral-500">Din notițe: {place.duration.text}</p>}
            </div>
          )}
          <label className="block text-xs font-semibold text-neutral-500">
            Ziua
            <select
              value={day.date}
              onChange={(e) => {
                const to = e.target.value;
                if (to !== day.date) change(`${name} → ${formatDateRo(to)}`, scheduleItem(item.id, to, item.start));
              }}
              className="mt-1.5 block w-full min-h-[44px] rounded-xl border border-neutral-300 px-2 text-sm font-medium text-neutral-900 bg-white"
            >
              {doc.days.map((d) => (
                <option key={d.date} value={d.date}>
                  {dayOptionLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => change(item.done ? `${name}: nefăcut` : `${name}: făcut`, setItemDone(item.id, !item.done))}
              className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border text-sm font-semibold ${item.done ? 'bg-green-600 border-green-600 text-white' : 'border-neutral-300'}`}
            >
              <Check size={15} /> {item.done ? 'Făcut' : 'Marchează făcut'}
            </button>
            <button
              type="button"
              onClick={() => change(item.fixed ? `${name}: oră liberă` : `${name}: oră fixă`, updateItem(item.id, { fixed: !item.fixed }))}
              className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border text-sm font-semibold ${item.fixed ? 'bg-amber-100 border-amber-300 text-amber-900' : 'border-neutral-300'}`}
              title="O oră fixă nu se mută prin tragere în calendar"
            >
              {item.fixed ? <Lock size={15} /> : <Unlock size={15} />} {item.fixed ? 'Oră fixă' : 'Fixează ora'}
            </button>
            {item.start && (
              <button type="button" onClick={() => setStart(null, `${name}: fără oră`)} className="min-h-[40px] px-3 rounded-xl border border-neutral-300 text-sm font-semibold">
                Fără oră
              </button>
            )}
          </div>
        </section>

        {item.routes.length > 0 && <RouteList item={item} open={item.routes.length === 1} />}
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 text-sm font-semibold">
          {place && (
            <Link href={placeHref(place.id)} className="inline-flex items-center gap-1 underline underline-offset-2">
              <MapPin size={14} /> Vezi locul
            </Link>
          )}
          <Link href={dayHref(day.date)} className="inline-flex items-center gap-1 underline underline-offset-2">
            <CalendarDays size={14} /> Ziua
          </Link>
          <Link href={`${BASE}/harta?zi=${day.date}`} className="inline-flex items-center gap-1 underline underline-offset-2">
            <MapIcon size={14} /> Pe hartă
          </Link>
          <button type="button" onClick={() => setConfirmRemove(true)} className="ml-auto inline-flex items-center gap-1 text-red-700">
            <Trash2 size={14} /> Scoate
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Scoate din program"
        message={`Scoți „${name}” din ${formatDateRo(day.date)}?`}
        note={place ? 'Locul rămâne în listă; îl poți programa din nou oricând.' : undefined}
        confirmLabel="Scoate"
        cancelLabel="Renunță"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          if (change(`${name} scos din program`, removeItem(item.id))) onClose();
        }}
      />
    </Sheet>
  );
}

function ShiftButton({ delta, disabled, onClick }: { delta: number; disabled: boolean; onClick: () => void }) {
  const text = `${delta < 0 ? '−' : '+'}${Math.abs(delta) >= 60 ? `${Math.abs(delta) / 60} h` : Math.abs(delta)}`;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${delta < 0 ? 'Mai devreme' : 'Mai târziu'} cu ${Math.abs(delta)} minute`}
      className="min-w-[44px] h-11 px-2 inline-flex items-center justify-center rounded-xl border border-neutral-300 text-sm font-semibold tabular-nums disabled:opacity-35"
    >
      {text}
    </button>
  );
}
