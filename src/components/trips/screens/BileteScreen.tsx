'use client';

import Link from '../TripLink';
import { useState } from 'react';
import { Clock, ExternalLink, Lock, Pencil, Plane, StickyNote } from 'lucide-react';
import type { Place } from '@/lib/trips/schema';
import { formatDateRo, formatDateShort } from '@/lib/trips/time';
import { itemName } from '@/lib/trips/validate';
import { setBookingStatus, setTripNotes } from '@/lib/trips/mutations';
import { useTrip } from '../TripProvider';
import { dayHref, placeHref } from '../tripConfig';
import { scheduledDates, ticketsToBuy } from '../helpers';
import { Card, Chip, ExtLink, SectionTitle } from '../ui';
import { useAiContext } from '../ai';
import { ticketsPage } from '../aiPages';

/** Bilete — tickets to buy, tickets bought, and every fixed time of the trip. */
export function BileteScreen() {
  const { doc, places } = useTrip();
  const todo = ticketsToBuy(doc);
  const dates = scheduledDates(doc);
  const booked = doc.places.filter((p) => p.booking?.status === 'booked');
  useAiContext(ticketsPage(doc));

  type Fixed = { date: string; time: string | null; label: string; kind: 'fixed' | 'deadline' | 'flight'; href: string };
  const fixed: Fixed[] = [
    { date: doc.trip.arrival.date, time: doc.trip.arrival.time, label: `Aterizare ${doc.trip.arrival.airport}`, kind: 'flight' as const, href: dayHref(doc.trip.arrival.date) },
    ...doc.days.flatMap((d) =>
      d.items
        .filter((i) => (i.fixed || i.kind === 'deadline') && !(i.kind === 'transport' && /aterizare/i.test(i.label ?? '')))
        .map((i): Fixed => ({ date: d.date, time: i.start, label: itemName(i, places), kind: i.kind === 'deadline' ? 'deadline' : 'fixed', href: dayHref(d.date) })),
    ),
    { date: doc.trip.departure.date, time: doc.trip.departure.time, label: `Zbor de întoarcere din ${doc.trip.departure.airport}`, kind: 'flight' as const, href: dayHref(doc.trip.departure.date) },
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99').localeCompare(b.time ?? '99'));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bilete</h1>

      <TripNotes />

      <section>
        <SectionTitle>De luat</SectionTitle>
        {todo.length === 0 ? (
          <Card className="p-4 text-sm text-neutral-600">Toate biletele sunt luate.</Card>
        ) : (
          <ul className="space-y-2">
            {todo.map(({ place, dates: d }) => (
              <TodoTicket key={place.id} place={place} dates={d} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>Luate</SectionTitle>
        {booked.length === 0 ? (
          <Card className="p-4 text-sm text-neutral-600">Niciun bilet luat încă.</Card>
        ) : (
          <ul className="space-y-2">
            {booked.map((p) => (
              <li key={p.id}>
                <Card className="p-3 flex flex-wrap items-center gap-2">
                  <Link href={placeHref(p.id)} className="font-semibold flex-1 min-w-0">
                    {p.name}
                    <span className="block text-xs font-normal text-neutral-500">{(dates.get(p.id) ?? []).map(formatDateShort).join(', ') || 'neprogramat'}</span>
                  </Link>
                  <Chip tone="green">{p.kind === 'event' ? 'confirmat' : 'luat'}</Chip>
                  {p.booking?.reference && <span className="text-sm font-mono text-neutral-700">{p.booking.reference}</span>}
                  <BookedUndo place={p} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>Ore fixe</SectionTitle>
        <Card className="divide-y divide-neutral-100">
          {fixed.map((f, i) => (
            <Link key={`${f.date}-${i}`} href={f.href} className={`flex items-center gap-3 px-4 min-h-[52px] ${f.kind === 'deadline' ? 'bg-amber-50' : ''}`}>
              <span className="w-16 text-xs font-semibold text-neutral-500">{formatDateShort(f.date)}</span>
              <span className="w-12 text-sm font-bold tabular-nums">{f.time ?? '—'}</span>
              <span className="flex-1 text-sm">{f.label}</span>
              {f.kind === 'deadline' ? <Clock size={16} className="text-amber-700" /> : f.kind === 'flight' ? <Plane size={16} className="text-neutral-500" /> : <Lock size={14} className="text-neutral-500" />}
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}

/** Notes and reminders for the whole trip, on top of the page; links in them can be tapped. */
function TripNotes() {
  const { doc, mutate } = useTrip();
  const saved = doc.trip.notes ?? '';
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(saved);
  const save = () => {
    if (text.trim() === saved.trim() || mutate(setTripNotes(text.trim() || null))) setEditing(false);
  };
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <StickyNote size={16} className="text-amber-700" />
        <h2 className="flex-1 text-sm font-bold text-amber-950">Note și remindere</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setText(saved);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 min-h-[36px] px-2 text-xs font-semibold text-amber-900"
          >
            <Pencil size={13} /> Editează
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.max(5, text.split('\n').length + 1)}
            autoFocus
            aria-label="Note și remindere"
            className="w-full rounded-xl border border-amber-300 bg-white p-3 text-sm leading-relaxed focus:outline-none focus:border-amber-600"
          />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="min-h-[40px] px-4 rounded-xl bg-black text-white text-sm font-semibold">
              Salvează
            </button>
            <button type="button" onClick={() => setEditing(false)} className="min-h-[40px] px-4 rounded-xl border border-amber-300 text-sm font-semibold">
              Renunță
            </button>
          </div>
        </div>
      ) : saved ? (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-950">
          {saved.split(/(https?:\/\/[^\s)]+)/).map((part, i) =>
            /^https?:\/\//.test(part) ? (
              <ExtLink key={i} href={part} className="underline underline-offset-2">
                {part.replace(/^https?:\/\//, '')}
              </ExtLink>
            ) : (
              part
            ),
          )}
        </p>
      ) : (
        <p className="text-sm text-amber-900/70">Nimic notat încă.</p>
      )}
    </section>
  );
}

function TodoTicket({ place, dates }: { place: Place; dates: string[] }) {
  const { mutate, toast } = useTrip();
  const [ref, setRef] = useState('');
  const [open, setOpen] = useState(false);
  const b = place.booking!;
  const isEvent = place.kind === 'event';
  const waitlisted = /^Ești pe lista/.test(b.note ?? '');
  return (
    <li>
      <Card className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={placeHref(place.id)} className="font-bold">
              {place.name}
            </Link>
            <p className="text-sm text-neutral-600">{dates.length ? dates.map(formatDateRo).join(' · ') : 'neprogramat'}</p>
          </div>
          <Chip tone="amber">{waitlisted ? 'pe listă' : isEvent ? 'de confirmat' : 'de luat'}</Chip>
        </div>
        {b.note && <p className="text-sm text-neutral-700 whitespace-pre-wrap">{b.note}</p>}
        <div className="flex flex-wrap gap-2">
          {b.url && (
            <ExtLink href={b.url} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-black text-white text-sm font-semibold">
              {isEvent ? 'Pagina evenimentului' : 'Cumpără'} <ExternalLink size={14} />
            </ExtLink>
          )}
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="min-h-[44px] px-4 rounded-xl border border-neutral-300 text-sm font-semibold">
              {isEvent ? 'M-am înregistrat' : 'Am luat biletul'}
            </button>
          ) : (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (mutate(setBookingStatus(place.id, 'booked', ref.trim() || undefined))) toast(`${place.name}: ${isEvent ? 'confirmat' : 'bilet luat'}`);
              }}
            >
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Cod rezervare (opțional)"
                autoFocus
                className="min-h-[44px] rounded-xl border border-neutral-300 px-3 text-sm"
              />
              <button type="submit" className="min-h-[44px] px-4 rounded-xl bg-green-700 text-white text-sm font-semibold">
                Salvează
              </button>
            </form>
          )}
        </div>
      </Card>
    </li>
  );
}

function BookedUndo({ place }: { place: Place }) {
  const { mutate } = useTrip();
  return (
    <button type="button" onClick={() => mutate(setBookingStatus(place.id, 'todo'))} className="text-xs text-neutral-500 underline min-h-[36px]">
      Anulează
    </button>
  );
}
