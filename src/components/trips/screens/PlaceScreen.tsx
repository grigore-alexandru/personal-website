'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ExternalLink, MapPinned } from 'lucide-react';
import type { Place } from '@/lib/trips/schema';
import { CATEGORY_LABEL, formatMoney, lineMoney } from '@/lib/trips/money';
import { formatDateRo, formatDateShort, navigationTarget } from '@/lib/trips/time';
import { addPlaceToDay, setBookingStatus } from '@/lib/trips/mutations';
import { useTrip } from '../TripProvider';
import { AREA, BASE, PLACE_KIND, dayHref, placeHref } from '../tripConfig';
import { dayOptionLabel, scheduledDates } from '../helpers';
import { Card, Chip, ExtLink, NavigateButtons, NoteText, PlacePhoto, SectionTitle } from '../ui';

const searchUrl = (p: Place) => {
  const t = navigationTarget(p);
  if (!t) return null;
  const q = new URLSearchParams({ api: '1', query: `${t.lat},${t.lng}` });
  if (t.googlePlaceId) q.set('query_place_id', t.googlePlaceId);
  return `https://www.google.com/maps/search/?${q.toString()}`;
};

/** Loc — one place: photos, schedule, practical info, booking. */
export function PlaceScreen({ placeId }: { placeId: string }) {
  const { doc, places, mutate, toast } = useTrip();
  const place = places.get(placeId);
  const [when, setWhen] = useState('');

  if (!place) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold">Locul nu există.</p>
        <Link href={`${BASE}/locuri`} className="mt-3 inline-block underline">
          Înapoi la Locuri
        </Link>
      </div>
    );
  }

  const dates = scheduledDates(doc).get(place.id) ?? [];
  const children = doc.places.filter((p) => p.parentId === place.id);
  const parent = place.parentId ? places.get(place.parentId) : undefined;
  const gmaps = searchUrl(place);

  return (
    <div className="space-y-5">
      <Link href={parent ? placeHref(parent.id) : `${BASE}/locuri`} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-neutral-700">
        <ChevronLeft size={18} /> {parent ? parent.name : 'Locuri'}
      </Link>

      {place.photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1">
          {place.photos.map((ph, i) => (
            <PlacePhoto
              key={`${ph.source}-${i}`}
              place={place}
              index={i}
              className={`aspect-video rounded-2xl snap-center flex-shrink-0 ${place.photos.length > 1 ? 'w-[88%]' : 'w-full'}`}
              sizes="(min-width: 960px) 850px, 88vw"
            />
          ))}
        </div>
      ) : (
        <PlacePhoto place={place} className="aspect-[21/9] w-full rounded-2xl" />
      )}

      <div>
        <p className="text-sm text-neutral-500">
          {PLACE_KIND[place.kind]} · {AREA[place.area]}
        </p>
        <h1 className="text-2xl font-bold leading-tight">{place.name}</h1>
        {place.location?.address && <p className="text-sm text-neutral-600 mt-0.5">{place.location.address}</p>}
        {place.meetingPoint && (
          <p className="text-sm text-neutral-600 mt-0.5">
            Punct de plecare: <span className="font-semibold">{place.meetingPoint.name}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <NavigateButtons target={navigationTarget(place)} />
        {gmaps && (
          <ExtLink href={gmaps} className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2">
            <MapPinned size={16} /> Deschide în Google Maps
          </ExtLink>
        )}
        {!place.location && !place.meetingPoint && <p className="text-sm text-neutral-500">Nu are încă locație pe hartă.</p>}
      </div>

      <section>
        <SectionTitle>Programat în</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {dates.length === 0 && <span className="text-sm text-neutral-500">Neprogramat.</span>}
          {dates.map((d) => (
            <Link key={d} href={dayHref(d)} className="inline-flex items-center min-h-[36px] px-3 rounded-full bg-sky-100 text-sky-900 text-sm font-semibold">
              {formatDateShort(d)}
            </Link>
          ))}
        </div>
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (when && mutate(addPlaceToDay(place.id, when))) {
              toast(`${place.name} programat în ${formatDateRo(when)}`);
              setWhen('');
            }
          }}
        >
          <select value={when} onChange={(e) => setWhen(e.target.value)} className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-neutral-300 bg-white px-2 text-sm" aria-label="Zi">
            <option value="">Alege ziua…</option>
            {doc.days.map((d) => (
              <option key={d.date} value={d.date}>
                {dayOptionLabel(d)}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!when} className="min-h-[44px] px-4 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-40">
            Programează
          </button>
        </form>
      </section>

      {children.length > 0 && (
        <section>
          <SectionTitle>Opriri</SectionTitle>
          <Card className="divide-y divide-neutral-100">
            {children.map((c) => (
              <Link key={c.id} href={placeHref(c.id)} className="flex items-center justify-between px-4 min-h-[48px] text-sm font-medium">
                {c.name}
                <span className="text-xs text-neutral-500">{(scheduledDates(doc).get(c.id) ?? []).map(formatDateShort).join(', ')}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {(place.hours || place.duration || place.transport) && (
        <Card className="p-4 space-y-3">
          {place.hours && (
            <div>
              <p className="text-xs font-semibold text-neutral-500">Program</p>
              <p className="text-sm">{place.hours.text}</p>
            </div>
          )}
          {place.duration && (
            <div>
              <p className="text-xs font-semibold text-neutral-500">Durată</p>
              <p className="text-sm">{place.duration.text}</p>
            </div>
          )}
          {place.transport && (
            <div>
              <p className="text-xs font-semibold text-neutral-500">Transport</p>
              <NoteText text={place.transport} />
            </div>
          )}
        </Card>
      )}

      {place.notes && (
        <section>
          <SectionTitle>Note</SectionTitle>
          <NoteText text={place.notes} />
        </section>
      )}

      {place.links.length > 0 && (
        <section>
          <SectionTitle>Linkuri</SectionTitle>
          <ul className="space-y-1">
            {place.links.map((l) => (
              <li key={l.url}>
                <ExtLink href={l.url} className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2">
                  {l.label} <ExternalLink size={13} />
                </ExtLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {place.costTemplate.length > 0 && (
        <section>
          <SectionTitle>Costuri la fiecare vizită</SectionTitle>
          <Card className="divide-y divide-neutral-100">
            {place.costTemplate.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div>
                  <p className="text-sm">{c.label}</p>
                  <p className="text-[11px] text-neutral-500">
                    {CATEGORY_LABEL[c.category]}
                    {c.note && ` · ${c.note}`}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatMoney(lineMoney(c))}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {place.booking && <BookingBlock place={place} />}
    </div>
  );
}

function BookingBlock({ place }: { place: Place }) {
  const { mutate } = useTrip();
  const b = place.booking!;
  const [ref, setRef] = useState(b.reference ?? '');
  useEffect(() => setRef(b.reference ?? ''), [b.reference]);
  const options = [
    { id: 'todo', label: 'De luat' },
    { id: 'booked', label: 'Luat' },
    { id: 'not-needed', label: 'Nu e nevoie' },
  ] as const;

  return (
    <section>
      <SectionTitle right={b.required ? <Chip tone="amber">obligatoriu</Chip> : undefined}>Rezervare</SectionTitle>
      <Card className="p-4 space-y-3">
        {b.note && <p className="text-sm whitespace-pre-wrap">{b.note}</p>}
        <div className="inline-flex rounded-xl border border-neutral-300 p-0.5" role="group" aria-label="Starea rezervării">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={b.status === o.id}
              onClick={() => b.status !== o.id && mutate(setBookingStatus(place.id, o.id))}
              className={`min-h-[40px] px-3 rounded-lg text-sm font-semibold ${b.status === o.id ? 'bg-black text-white' : 'text-neutral-600'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="block text-xs font-semibold text-neutral-600">
          Cod rezervare
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            onBlur={() => ref.trim() !== (b.reference ?? '') && mutate(setBookingStatus(place.id, b.status, ref.trim() || ''))}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="mt-1 block w-full min-h-[44px] rounded-xl border border-neutral-300 px-3 text-sm font-normal"
          />
        </label>
        {b.url && (
          <ExtLink href={b.url} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-black text-white text-sm font-semibold">
            Cumpără <ExternalLink size={14} />
          </ExtLink>
        )}
      </Card>
    </section>
  );
}
