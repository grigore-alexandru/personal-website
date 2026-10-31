'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Item, Place } from '@/lib/trips/schema';
import { addLabelItem, addPlaceAt } from '@/lib/trips/mutations';
import { formatDateRo } from '@/lib/trips/time';
import { useTrip } from '../TripProvider';
import { AREA, PLACE_KIND } from '../tripConfig';
import { minutesText, scheduledDates } from '../helpers';
import { PlacePhoto } from '../ui';
import type { Change } from './ActivitySheet';
import { Sheet } from './Sheet';

const LENGTHS = [30, 60, 90, 120, 180, 240];
const KINDS: { kind: Item['kind']; label: string }[] = [
  { kind: 'visit', label: 'Activitate / eveniment' },
  { kind: 'transport', label: 'Drum' },
  { kind: 'deadline', label: 'Limită fixă (ultimul feribot…)' },
  { kind: 'note', label: 'Notă' },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "Adaugă la 14:30": schedule a place (unscheduled first) or a free-text activity at the tapped slot. */
export function AddSheet({ slot, onClose, change }: { slot: { date: string; start: string } | null; onClose: () => void; change: Change }) {
  const { doc } = useTrip();
  const [tab, setTab] = useState<'place' | 'other'>('place');
  const [q, setQ] = useState('');
  const [length, setLength] = useState<number | null>(null); // null = the place's own duration (or 1 h)
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<Item['kind']>('visit');
  const scheduled = useMemo(() => scheduledDates(doc), [doc]);

  const close = () => {
    setQ('');
    setLabel('');
    setLength(null);
    onClose();
  };
  if (!slot) return <Sheet open={false} onClose={onClose} label="Adaugă">{null}</Sheet>;

  const matches = (p: Place) => !q || norm(`${p.name} ${p.location?.name ?? ''} ${PLACE_KIND[p.kind]}`).includes(norm(q));
  const unscheduled = doc.places.filter((p) => !scheduled.has(p.id) && matches(p));
  const rest = doc.places.filter((p) => scheduled.has(p.id) && matches(p));

  const pick = (p: Place) => {
    const len = length ?? p.duration?.minMinutes ?? 60;
    if (change(`${p.name} la ${slot.start}`, addPlaceAt(p.id, slot.date, slot.start, len))) close();
  };
  const addOther = () => {
    if (!label.trim()) return;
    if (change(`${label.trim()} la ${slot.start}`, addLabelItem(slot.date, label, kind, slot.start, kind === 'deadline' ? null : length ?? 60))) close();
  };

  const row = (p: Place) => (
    <li key={p.id}>
      <button type="button" onClick={() => pick(p)} className="w-full flex items-center gap-3 rounded-xl p-2 text-left hover:bg-neutral-50 active:bg-neutral-100 min-h-[56px]">
        <PlacePhoto place={p} thumb className="w-11 h-11 rounded-lg flex-shrink-0" sizes="44px" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{p.name}</span>
          <span className="block text-xs text-neutral-500 truncate">
            {PLACE_KIND[p.kind]} · {AREA[p.area]}
            {p.duration?.minMinutes ? ` · ${minutesText(p.duration.minMinutes)}` : ''}
            {scheduled.get(p.id)?.length ? ` · deja pe ${scheduled.get(p.id)!.map((d) => Number(d.slice(8))).join(', ')} nov` : ''}
          </span>
        </span>
        <Plus size={18} className="text-neutral-400" />
      </button>
    </li>
  );

  return (
    <Sheet open onClose={close} label="Adaugă în program">
      <div className="px-5 pt-3 md:pt-5 space-y-3">
        <div className="pr-10">
          <h2 className="text-xl font-bold">Adaugă la {slot.start}</h2>
          <p className="text-sm text-neutral-500">{formatDateRo(slot.date)}</p>
        </div>
        <div className="flex rounded-xl bg-neutral-100 p-1" role="tablist">
          {(['place', 'other'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 min-h-[38px] rounded-lg text-sm font-semibold ${tab === t ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
            >
              {t === 'place' ? 'Un loc' : 'Altceva'}
            </button>
          ))}
        </div>
        {!(tab === 'other' && kind === 'deadline') && (
          <div>
            <p className="text-xs font-semibold text-neutral-500 mb-1">Durată</p>
            <div className="flex flex-wrap gap-1.5">
              <LengthChip on={length == null} onClick={() => setLength(null)}>
                {tab === 'place' ? 'ca în notițe' : '1 h'}
              </LengthChip>
              {LENGTHS.map((l) => (
                <LengthChip key={l} on={length === l} onClick={() => setLength(l)}>
                  {minutesText(l)}
                </LengthChip>
              ))}
            </div>
          </div>
        )}
        {tab === 'place' ? (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută un loc" className="w-full min-h-[44px] rounded-xl border border-neutral-300 pl-9 pr-3 text-sm" />
            </div>
            {unscheduled.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-1">Neprogramate</p>
                <ul>{unscheduled.map(row)}</ul>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-1">Toate</p>
              <ul>{rest.map(row)}</ul>
              {unscheduled.length + rest.length === 0 && <p className="text-sm text-neutral-500 py-4">Niciun loc găsit.</p>}
            </div>
          </>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              addOther();
            }}
          >
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ce faci? (ex. Concert la The Fillmore)"
              className="w-full min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base"
              autoFocus
            />
            <select value={kind} onChange={(e) => setKind(e.target.value as Item['kind'])} className="w-full min-h-[44px] rounded-xl border border-neutral-300 px-2 text-sm bg-white">
              {KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}
                </option>
              ))}
            </select>
            <button type="submit" disabled={!label.trim()} className="w-full min-h-[48px] rounded-xl bg-black text-white font-semibold disabled:opacity-40">
              Adaugă
            </button>
          </form>
        )}
      </div>
    </Sheet>
  );
}

function LengthChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-[34px] px-3 rounded-full text-xs font-semibold border ${on ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-300'}`}
    >
      {children}
    </button>
  );
}
