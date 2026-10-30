'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { AlertCircle, AlertTriangle, Car, ExternalLink, Footprints, ImageIcon, Info, Navigation } from 'lucide-react';
import type { CostLine, Day, GeoPoint, Place } from '@/lib/trips/schema';
import { formatMoney, formatRon, type Money } from '@/lib/trips/money';
import { mapsDirectionsUrl } from '@/lib/trips/time';
import type { Warning } from '@/lib/trips/validate';
import { CATEGORY_LABEL } from '@/lib/trips/money';
import { MutationError, parseDollarRange, updateCost, type CostOwner } from '@/lib/trips/mutations';
import { useTrip } from './TripProvider';
import { DAY_KIND } from './tripConfig';

export function MoneyText({ money, compact, ron, className = '' }: { money: Money; compact?: boolean; ron?: boolean; className?: string }) {
  const { doc } = useTrip();
  const hint = ron ? formatRon(money.minCents, doc.trip.fxRonPerUsd) : null;
  return (
    <span className={`tabular-nums ${className}`}>
      {formatMoney(money, { compact })}
      {hint && <span className="ml-1 text-xs font-normal text-neutral-500">{hint}</span>}
    </span>
  );
}

export function StatusChip({ status }: { status: Day['status'] }) {
  return status === 'confirmed' ? (
    <span className="inline-flex items-center rounded-full bg-black text-white px-2 py-0.5 text-[11px] font-semibold">confirmat</span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-dashed border-neutral-400 text-neutral-600 px-2 py-0.5 text-[11px] font-semibold">
      propus
    </span>
  );
}

export function KindDot({ kind }: { kind: Day['kind'] }) {
  return <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${DAY_KIND[kind].dot}`} />;
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'amber' | 'red' | 'green' | 'blue' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-sky-100 text-sky-800',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export const worstSeverity = (ws: Warning[] | undefined) =>
  ws?.some((w) => w.severity === 'error') ? 'error' : ws?.some((w) => w.severity === 'warn') ? 'warn' : null;

export function WarningDot({ warnings }: { warnings: Warning[] | undefined }) {
  const s = worstSeverity(warnings);
  if (!s) return null;
  return (
    <span
      title={s === 'error' ? 'Problemă' : 'Atenție'}
      className={`inline-block w-2.5 h-2.5 rounded-full ${s === 'error' ? 'bg-red-500' : 'bg-amber-400'}`}
    >
      <span className="sr-only">{s === 'error' ? 'Problemă' : 'Atenție'}</span>
    </span>
  );
}

const ORDER = { error: 0, warn: 1, info: 2 } as const;

export function WarningList({ warnings, className = '' }: { warnings: Warning[]; className?: string }) {
  if (warnings.length === 0) return null;
  const sorted = [...warnings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {sorted.map((w, i) => {
        const style =
          w.severity === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : w.severity === 'warn'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-neutral-50 border-neutral-200 text-neutral-700';
        const Icon = w.severity === 'error' ? AlertCircle : w.severity === 'warn' ? AlertTriangle : Info;
        return (
          <li key={`${w.code}-${w.itemId ?? ''}-${i}`} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${style}`}>
            <Icon size={16} className="mt-0.5 flex-shrink-0" />
            <span>{w.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ExtLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/** Big "Navighează" (transit) plus small walking / driving alternatives. Hidden without a target. */
export function NavigateButtons({ target, size = 'lg' }: { target: GeoPoint | null; size?: 'lg' | 'sm' }) {
  if (!target) return null;
  if (size === 'sm') {
    return (
      <ExtLink
        href={mapsDirectionsUrl(target, 'transit')}
        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-black text-white text-xs font-semibold"
      >
        <Navigation size={14} /> Navighează
      </ExtLink>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ExtLink
        href={mapsDirectionsUrl(target, 'transit')}
        className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-black text-white font-semibold flex-1 sm:flex-none"
      >
        <Navigation size={18} /> Navighează
      </ExtLink>
      <ExtLink
        href={mapsDirectionsUrl(target, 'walking')}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-neutral-300 text-sm font-medium"
      >
        <Footprints size={16} /> Pe jos
      </ExtLink>
      <ExtLink
        href={mapsDirectionsUrl(target, 'driving')}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-neutral-300 text-sm font-medium"
      >
        <Car size={16} /> Mașină
      </ExtLink>
    </div>
  );
}

/**
 * Photo from the private trip-media bucket through a signed URL. Signed URLs change on every
 * load, so the image optimizer is bypassed (`unoptimized`); the upload script already makes
 * WebP thumbnails. On error: refresh the signed URLs once, then show the placeholder.
 */
export function PlacePhoto({
  place,
  index = 0,
  thumb = false,
  className = '',
  sizes = '100vw',
}: {
  place: Place | undefined;
  index?: number;
  thumb?: boolean;
  className?: string;
  sizes?: string;
}) {
  const { photoUrl, refreshPhotos } = useTrip();
  const photo = place?.photos[index];
  const url = photoUrl(photo?.path ?? null, thumb);
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);
  useEffect(() => setFailed(false), [url]);

  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      {url && !failed ? (
        <Image
          src={url}
          alt={photo?.alt ?? place?.name ?? ''}
          fill
          unoptimized
          sizes={sizes}
          className="object-cover"
          onError={() => {
            if (!retried) {
              setRetried(true);
              void refreshPhotos();
            } else setFailed(true);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-400 p-2 text-center">
          <ImageIcon size={thumb ? 18 : 28} />
          {!thumb && place && <span className="text-xs font-medium text-neutral-500">{place.name}</span>}
        </div>
      )}
    </div>
  );
}

/** Verbatim Obsidian text: pre-wrap, never HTML; long notes collapse after ~6 lines. */
export function NoteText({ text, className = '' }: { text: string; className?: string }) {
  const long = text.split('\n').length > 6 || text.length > 420;
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <p className={`whitespace-pre-wrap text-sm text-neutral-700 leading-relaxed ${long && !open ? 'line-clamp-6' : ''}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-sm font-semibold text-neutral-900 underline underline-offset-2">
          {open ? 'Mai puțin' : 'Mai mult'}
        </button>
      )}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-neutral-200 bg-white ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h2 className="text-base font-bold text-neutral-900">{children}</h2>
      {right}
    </div>
  );
}

const centsToInput = (c: CostLine) =>
  c.amountCents == null ? '' : c.amountMaxCents != null ? `${c.amountCents / 100}-${c.amountMaxCents / 100}` : String(c.amountCents / 100);

/** Amount field that keeps its own text while focused and saves on blur / Enter. */
export function AmountInput({ line, owner, placeholder = 'de completat' }: { line: CostLine; owner: CostOwner; placeholder?: string }) {
  const { mutate, toast } = useTrip();
  const initial = centsToInput(line);
  const [text, setText] = useState(initial);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(initial);
  }, [initial, focused]);

  const save = () => {
    if (text.trim() === initial) return;
    try {
      const [min, max] = parseDollarRange(text);
      mutate(updateCost(owner, line.id, { amountCents: min, amountMaxCents: max }));
    } catch (e) {
      toast(e instanceof MutationError ? e.message : String(e), 'error');
      setText(initial);
    }
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400">$</span>
      <input
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        aria-label={`Sumă pentru ${line.label}`}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setText(initial);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-28 min-h-[40px] rounded-lg border border-neutral-300 pl-6 pr-2 text-sm tabular-nums focus:outline-none focus:border-black"
      />
    </div>
  );
}

/** One editable cost line: label, amount (single or range), paid toggle, note. */
export function CostLineRow({ line, owner, onRemove }: { line: CostLine; owner: CostOwner; onRemove?: () => void }) {
  const { mutate } = useTrip();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 border-b border-neutral-100 last:border-0">
      <div className="flex-1 min-w-[140px]">
        <p className="text-sm text-neutral-900">{line.label}</p>
        <p className="text-[11px] text-neutral-500">
          {CATEGORY_LABEL[line.category]}
          {line.qty > 1 && ` · × ${line.qty}`}
          {line.note && ` · ${line.note}`}
        </p>
      </div>
      <AmountInput line={line} owner={owner} />
      <label className="inline-flex items-center gap-1.5 min-h-[40px] text-xs font-medium text-neutral-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={line.paid}
          aria-label={`Plătit: ${line.label}`}
          onChange={(e) => mutate(updateCost(owner, line.id, { paid: e.target.checked }))}
          className="w-4 h-4 accent-black"
        />
        Plătit
      </label>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-xs text-neutral-400 hover:text-red-600 min-h-[40px] px-1">
          Șterge
        </button>
      )}
    </div>
  );
}
