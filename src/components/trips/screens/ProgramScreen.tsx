'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import Link from '../TripLink';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, Check, Info, Trash2, ChevronDown, ChevronLeft, ChevronRight, Lock, Map as MapIcon, Minus, Plus, Ticket, Undo2, Wand2 } from 'lucide-react';
import type { Day, Item, Place } from '@/lib/trips/schema';
import { autoScheduleDay, diffItems, findItem, removeItem, restoreItems, scheduleItem, updateItem, type Mutation } from '@/lib/trips/mutations';
import { formatDateRo, formatDateShort, fromMinutes, toMinutes, weekdayName, weekdayOf } from '@/lib/trips/time';
import { itemName, type Warning } from '@/lib/trips/validate';
import { useTrip } from '../TripProvider';
import { BASE, CACHE_KEY, DAY_KIND, ITEM_KIND_HEX, PLACE_KIND_HEX, dayHref } from '../tripConfig';
import { minutesText } from '../helpers';
import { useAiContext } from '../ai';
import { dayLines, placeDetails } from '../aiPages';
import { PlacePhoto, StatusChip, worstSeverity } from '../ui';
import { ActivitySheet, type Change } from '../program/ActivitySheet';
import { AddSheet } from '../program/AddSheet';
import { DAY_MIN, SNAP_MIN, clamp, gridMinutes, layoutColumns, shiftAnchor, snap, travelAround, visibleDates, type View } from '../program/calendarLayout';

const VIEW_KEY = `${CACHE_KEY}:program:view`;
const ZOOM_KEY = `${CACHE_KEY}:program:zoom`;
const TIP_KEY = `${CACHE_KEY}:program:tip`;
const ZOOMS = [40, 56, 76]; // pixels per hour
const GUTTER = 42;
const LONG_PRESS_MS = 320;
const VIEWS: { id: View; label: string; key: string }[] = [
  { id: 'day', label: 'Zi', key: 'd' },
  { id: '3day', label: '3 zile', key: '3' },
  { id: 'week', label: 'Săpt.', key: 'w' },
  { id: 'agenda', label: 'Agendă', key: 'a' },
];

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* convenience only */
  }
};

const colorOf = (item: Item, place: Place | undefined) => (place ? PLACE_KIND_HEX[place.kind] : ITEM_KIND_HEX[item.kind]);
const short = (date: string) => `${weekdayName(date).slice(0, 3)} ${formatDateShort(date)}`;

/** Right click (or a long press on something that can't be dragged): a small menu for one activity. */
const MenuCtx = createContext<(id: string, x: number, y: number) => void>(() => {});

/** contextmenu handler: never the browser's menu; ours unless a drag just happened (a long press that became a drag). */
function useMenuFor(justDragged?: React.MutableRefObject<boolean>) {
  const open = useContext(MenuCtx);
  return (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!justDragged?.current) open(id, e.clientX, e.clientY);
  };
}

type Target = { date: string; start: number | null; len: number };
type Press = {
  item: Item;
  mode: 'move' | 'resize';
  pointerId: number;
  touch: boolean;
  x: number;
  y: number;
  grab: number; // minutes between the item's start and the pointer
  len: number;
  active: boolean;
  timer: number | null;
};

/** Program — the trip as a calendar (day / 3 days / week / agenda): drag to move or resize, tap for details. */
export function ProgramScreen() {
  const { doc, places, warnings, today, nowMin, mutate, toast } = useTrip();
  const dates = useMemo(() => doc.days.map((d) => d.date), [doc]);
  const inTrip = (d: string | null | undefined): d is string => !!d && dates.includes(d);

  const [view, setViewState] = useState<View>(() => {
    const saved = read(VIEW_KEY) as View | null;
    return saved && VIEWS.some((v) => v.id === saved) ? saved : window.innerWidth >= 768 ? 'week' : '3day';
  });
  const [anchor, setAnchor] = useState<string>(() => {
    const q = new URLSearchParams(window.location.search).get('zi');
    return inTrip(q) ? q : inTrip(today) ? today : dates[0];
  });
  const [zoom, setZoomState] = useState(() => clamp(Number(read(ZOOM_KEY) ?? 1), 0, ZOOMS.length - 1));
  const hourPx = ZOOMS[zoom];
  const [selected, setSelected] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ date: string; start: string } | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [undo, setUndo] = useState<{ label: string; m: Mutation }[]>([]);
  const [bar, setBar] = useState<{ label: string; key: number } | null>(null);
  const [drag, setDrag] = useState<{ id: string; mode: Press['mode']; target: Target | null } | null>(null);
  const [tip, setTip] = useState(() => read(TIP_KEY) == null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const openMenu = useCallback((id: string, x: number, y: number) => setMenu({ id, x, y }), []);
  const hideTip = () => {
    setTip(false);
    write(TIP_KEY, '1');
  };

  const setView = (v: View) => {
    setViewState(v);
    write(VIEW_KEY, v);
  };
  const setZoom = (z: number) => {
    setZoomState(z);
    write(ZOOM_KEY, String(z));
  };

  const shown = useMemo(() => visibleDates(doc, view === 'agenda' ? 'day' : view, anchor), [doc, view, anchor]);
  const days = useMemo(() => shown.map((d) => doc.days.find((x) => x.date === d)!), [shown, doc]);

  // keep ?zi= in the address so a reload (or the back button from a place) comes back to the same days
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('zi', anchor);
    window.history.replaceState(window.history.state, '', url);
  }, [anchor]);

  // ---- edits with undo -------------------------------------------------------------------------
  const change: Change = useCallback(
    (label, m) => {
      let after;
      try {
        after = m(doc);
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), 'error');
        return false;
      }
      const { snaps, added } = diffItems(doc, after);
      if (snaps.length === 0 && added.length === 0) return true;
      if (!mutate(m)) return false;
      setUndo((u) => [...u.slice(-24), { label, m: restoreItems(snaps, added) }]);
      setBar({ label, key: Date.now() });
      return true;
    },
    [doc, mutate, toast],
  );

  const runUndo = useCallback(() => {
    const last = undo[undo.length - 1];
    if (!last) return;
    if (mutate(last.m)) {
      setUndo((u) => u.slice(0, -1));
      setBar(null);
      toast(`Anulat: ${last.label}`);
    }
  }, [undo, mutate, toast]);

  useEffect(() => {
    if (!bar) return;
    const t = window.setTimeout(() => setBar(null), 8000);
    return () => window.clearTimeout(t);
  }, [bar]);

  const [slide, setSlide] = useState<1 | -1>(1);
  const page = (dir: 1 | -1) => {
    setSlide(dir);
    setAnchor((a) => shiftAnchor(doc, view === 'agenda' ? 'day' : view, a, dir));
  };
  const goToday = () => setAnchor(dates.includes(today) ? today : today < dates[0] ? dates[0] : dates[dates.length - 1]);

  // keyboard: ← → pages, t today, d/3/w/a views, ⌘Z / Ctrl+Z undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (selected || slot) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        runUndo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') page(-1);
      else if (e.key === 'ArrowRight') page(1);
      else if (e.key === 't') goToday();
      else {
        const v = VIEWS.find((x) => x.key === e.key);
        if (v) setView(v.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---- what "Întreabă AI" sees ---------------------------------------------------------------
  const sel = selected ? findItem(doc, selected) : null;
  const rangeText = view === 'agenda' ? 'toată călătoria' : shown.length === 1 ? formatDateRo(shown[0]) : `${formatDateShort(shown[0])} – ${formatDateShort(shown[shown.length - 1])}`;
  const selLines = (() => {
    if (!sel) return [];
    const place = sel.item.placeId ? places.get(sel.item.placeId) : undefined;
    const { minutes } = gridMinutes(sel.item, places);
    const head = `Activitatea selectată: ${itemName(sel.item, places)} — ${formatDateRo(sel.day.date)}, ${sel.item.start ? `${sel.item.start}–${fromMinutes(toMinutes(sel.item.start) + minutes)}` : 'fără oră'}`;
    return [head, ...(place ? placeDetails(place, doc).slice(1) : [])];
  })();
  useAiContext({
    title: `Program — ${rangeText}${sel ? ` · ${itemName(sel.item, places)}` : ''}`,
    lines: [...selLines, ...(view === 'agenda' ? doc.days : days).flatMap((d) => dayLines(d, doc))],
    suggestions: [
      'E realist programul? Ce aș muta ca să pierd mai puțin timp pe drum?',
      'Propune ore pentru activitățile care nu au încă oră.',
      'Unde am timp liber în zilele astea și ce aș putea face atunci?',
    ],
  });

  // the grid fills the screen below the toolbars, so the page itself doesn't scroll (only the hours do)
  const offset = 234 + (view === 'day' ? 76 : 0) + (tip ? 52 : 0);
  const small = 'h-8 inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white disabled:opacity-30';

  return (
    <MenuCtx.Provider value={openMenu}>
    <div className={`space-y-2 ${view === 'agenda' ? '' : '-mb-10 md:mb-0'}`}>
      <h1 className="sr-only md:not-sr-only text-2xl font-bold md:pb-1">Program</h1>

      <div className="flex items-center gap-1">
        <div className="flex-1 flex rounded-lg bg-neutral-200/70 p-0.5" role="tablist" aria-label="Vedere">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={`flex-1 h-7 rounded-md text-xs font-semibold ${view === v.id ? 'bg-white shadow-sm text-black' : 'text-neutral-600'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {view !== 'agenda' && (
          <>
            <button type="button" onClick={() => setZoom(zoom - 1)} disabled={zoom === 0} aria-label="Micșorează" className={`${small} w-8`}>
              <Minus size={14} />
            </button>
            <button type="button" onClick={() => setZoom(zoom + 1)} disabled={zoom === ZOOMS.length - 1} aria-label="Mărește" className={`${small} w-8`}>
              <Plus size={14} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={runUndo}
          disabled={undo.length === 0}
          aria-label={undo.length ? `Anulează: ${undo[undo.length - 1].label}` : 'Nimic de anulat'}
          title="Anulează (⌘Z)"
          className={`${small} w-8 text-neutral-700`}
        >
          <Undo2 size={15} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        {view !== 'agenda' && (
          <button type="button" onClick={() => page(-1)} disabled={shown[0] === dates[0]} aria-label="Înapoi" className={`${small} w-8`}>
            <ChevronLeft size={16} />
          </button>
        )}
        <p className="flex-1 min-w-0 text-center text-sm font-bold truncate first-letter:uppercase">{rangeText}</p>
        {view !== 'agenda' && (
          <button type="button" onClick={() => page(1)} disabled={shown[shown.length - 1] === dates[dates.length - 1]} aria-label="Înainte" className={`${small} w-8`}>
            <ChevronRight size={16} />
          </button>
        )}
        <button type="button" onClick={goToday} className={`${small} px-2.5 text-xs font-semibold`}>
          Azi
        </button>
      </div>

      {view === 'agenda' ? (
        <Agenda anchor={anchor} onOpen={setSelected} />
      ) : (
        <>
          {tip && (
            <div className="flex items-start gap-2 rounded-xl bg-sky-50 border border-sky-100 px-3 py-2 text-[11px] leading-snug text-sky-900">
              <span className="flex-1">
                Ține apăsat pe o activitate și trage-o (și în altă zi, sau sus la „fără oră”); trage de marginea de jos ca s-o lungești. Atinge un loc liber ca să adaugi ceva.
              </span>
              <button type="button" onClick={hideTip} className="font-semibold underline underline-offset-2">
                Am înțeles
              </button>
            </div>
          )}

          {view === 'day' && <DayBar day={days[0]} change={change} />}

          <Grid
            days={days}
            view={view}
            hourPx={hourPx}
            offset={offset}
            trayOpen={trayOpen}
            setTrayOpen={setTrayOpen}
            drag={drag}
            setDrag={setDrag}
            onOpen={setSelected}
            onSlot={(date, start) => setSlot({ date, start: fromMinutes(start) })}
            onDayHeader={(date) => {
              setAnchor(date);
              setView('day');
            }}
            onPage={page}
            slide={slide}
            change={change}
            today={today}
            nowMin={nowMin}
            warnings={warnings}
          />
        </>
      )}

      {menu && (
        <ItemMenu
          {...menu}
          onClose={() => setMenu(null)}
          onOpen={() => setSelected(menu.id)}
          onRemove={() => {
            const f = findItem(doc, menu.id);
            if (f) change(`${itemName(f.item, places)} scos din program`, removeItem(menu.id));
          }}
        />
      )}

      <ActivitySheet itemId={selected} onClose={() => setSelected(null)} change={change} />
      <AddSheet slot={slot} onClose={() => setSlot(null)} change={change} />

      {bar && (
        <div
          key={bar.key}
          className="fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 max-w-[calc(100vw-32px)] rounded-full bg-neutral-900 text-white pl-4 pr-1.5 py-1.5 shadow-xl bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-6"
          role="status"
        >
          <span className="text-sm truncate">{bar.label}</span>
          <button type="button" onClick={runUndo} className="flex-shrink-0 min-h-[34px] px-3 rounded-full bg-white/15 text-sm font-semibold">
            Anulează
          </button>
        </div>
      )}
    </div>
    </MenuCtx.Provider>
  );
}

/** Day view: the day's title and status, planned hours, and "Așază automat". */
function DayBar({ day, change }: { day: Day; change: Change }) {
  const { places } = useTrip();
  const untimed = day.items.filter((i) => !i.start && i.kind !== 'deadline').length;
  const planned = day.items.reduce((s, i) => s + (i.kind === 'deadline' ? 0 : gridMinutes(i, places).minutes), 0);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 flex items-center gap-2 h-[68px]">
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight truncate">{day.title}</p>
        <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1 whitespace-nowrap overflow-hidden">
          <StatusChip status={day.status} /> ~{minutesText(planned)}
          {untimed ? ` · ${untimed} fără oră` : ''}
        </p>
      </div>
      {untimed > 0 && (
        <button
          type="button"
          onClick={() => change(`Ore puse automat pe ${formatDateShort(day.date)}`, autoScheduleDay(day.date))}
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-black text-white text-sm font-semibold"
          title="Pune ore activităților fără oră, în ordinea zilei, de la 09:00, cu pauză de drum între ele"
        >
          <Wand2 size={15} /> Auto
        </button>
      )}
      <Link href={dayHref(day.date)} aria-label="Deschide ziua" title="Ziua" className="flex-shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-xl border border-neutral-200">
        <CalendarDays size={17} />
      </Link>
      <Link href={`${BASE}/harta?zi=${day.date}`} aria-label="Ziua pe hartă" title="Pe hartă" className="flex-shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-xl border border-neutral-200">
        <MapIcon size={17} />
      </Link>
    </div>
  );
}

type GridProps = {
  days: Day[];
  view: View;
  hourPx: number;
  /** Pixels of chrome above and below the grid (header, toolbars, tab bar). */
  offset: number;
  trayOpen: boolean;
  setTrayOpen: (v: boolean) => void;
  drag: { id: string; mode: Press['mode']; target: Target | null } | null;
  setDrag: (d: { id: string; mode: Press['mode']; target: Target | null } | null) => void;
  onOpen: (id: string) => void;
  onSlot: (date: string, start: number) => void;
  onDayHeader: (date: string) => void;
  onPage: (dir: 1 | -1) => void;
  /** Direction of the last page change, for the slide-in. */
  slide: 1 | -1;
  change: Change;
  today: string;
  nowMin: number;
  warnings: Record<string, Warning[]>;
};

function Grid({ days, view, hourPx, offset, trayOpen, setTrayOpen, drag, setDrag, onOpen, onSlot, onDayHeader, onPage, slide, change, today, nowMin, warnings }: GridProps) {
  const { doc, places, toast } = useTrip();
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const last = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const justDragged = useRef(false);
  const edgeTimer = useRef<{ dir: 1 | -1; at: number } | null>(null);
  const daysRef = useRef(days);
  daysRef.current = days;
  // compact blocks and chips when a day column is narrow (a week on the phone), full labels when there is room
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = width > 0 ? (width - GUTTER) / days.length < 96 : view === 'week';
  const px = (min: number) => (min / 60) * hourPx;

  // where to look first: now (today), else a bit before the earliest timed activity, else 08:00
  const firstKey = days.map((d) => d.date).join();
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const starts = days.flatMap((d) => d.items.filter((i) => i.start).map((i) => toMinutes(i.start!)));
    const target = days.some((d) => d.date === today) ? nowMin - 90 : starts.length ? Math.min(...starts) - 45 : 8 * 60;
    el.scrollTop = px(clamp(target, 0, DAY_MIN));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the visible days or the zoom change
  }, [firstKey, hourPx]);

  /** Which day column and which minute are under a screen point; `tray` when above the hour grid. */
  const pointAt = useCallback(
    (x: number, y: number): { date: string; minute: number; tray: boolean } | null => {
      const cols = colsRef.current;
      const head = headRef.current;
      if (!cols || !head) return null;
      const r = cols.getBoundingClientRect();
      const ds = daysRef.current;
      const i = clamp(Math.floor(((x - r.left) / r.width) * ds.length), 0, ds.length - 1);
      const headBottom = head.getBoundingClientRect().bottom;
      return { date: ds[i].date, minute: ((y - r.top) / hourPx) * 60, tray: y < headBottom };
    },
    [hourPx],
  );

  const computeTarget = useCallback(
    (p: Press): Target | null => {
      const at = pointAt(last.current.x, last.current.y);
      if (!at) return null;
      if (p.mode === 'resize') {
        const start = p.item.start ? toMinutes(p.item.start) : 0;
        const found = findItem(doc, p.item.id);
        return { date: found?.day.date ?? at.date, start, len: clamp(snap(at.minute) - start, SNAP_MIN, DAY_MIN - start) };
      }
      if (at.tray) return { date: at.date, start: null, len: p.len };
      return { date: at.date, start: clamp(snap(at.minute - p.grab), 0, DAY_MIN - Math.max(p.len, SNAP_MIN)), len: p.len };
    },
    [pointAt, doc],
  );

  // auto-scroll near the top/bottom edge and change page near the left/right edge while dragging
  useEffect(() => {
    if (!drag) return;
    let raf = 0;
    const tick = () => {
      const p = press.current;
      const el = scrollRef.current;
      const cols = colsRef.current;
      const head = headRef.current;
      if (p?.active && el && cols && head) {
        const r = el.getBoundingClientRect();
        const top = head.getBoundingClientRect().bottom;
        const { x, y } = last.current;
        let dy = 0; // above `top` is the "fără oră" tray: a drop target, no scrolling there
        if (y >= top && y < top + 36) dy = -Math.ceil((top + 36 - y) / 4);
        else if (y > r.bottom - 40) dy = Math.ceil((y - (r.bottom - 40)) / 4);
        if (dy) {
          el.scrollTop += dy;
          setDrag({ id: p.item.id, mode: p.mode, target: computeTarget(p) });
        }
        const cr = cols.getBoundingClientRect();
        const dir: 1 | -1 | 0 = p.mode === 'move' && x < cr.left + 14 ? -1 : p.mode === 'move' && x > cr.right - 14 ? 1 : 0;
        if (!dir) edgeTimer.current = null;
        else if (!edgeTimer.current || edgeTimer.current.dir !== dir) edgeTimer.current = { dir, at: performance.now() };
        else if (performance.now() - edgeTimer.current.at > 700) {
          edgeTimer.current = { dir, at: performance.now() + 400 };
          onPage(dir);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loop runs for the life of one drag
  }, [!!drag]);

  // window listeners for one press; they call the latest handlers through a ref, so add/remove see the same functions
  const handlers = useRef({ move: (_: PointerEvent) => {}, up: (_: PointerEvent) => {}, cancel: () => {} });
  const listeners = useMemo(
    () => ({ move: (e: PointerEvent) => handlers.current.move(e), up: (e: PointerEvent) => handlers.current.up(e), cancel: () => handlers.current.cancel() }),
    [],
  );
  const endPress = useCallback(() => {
    const p = press.current;
    if (p?.timer) window.clearTimeout(p.timer);
    press.current = null;
    edgeTimer.current = null;
    window.removeEventListener('pointermove', listeners.move);
    window.removeEventListener('pointerup', listeners.up);
    window.removeEventListener('pointercancel', listeners.cancel);
  }, [listeners]);

  // A long press turns into a drag: from then on, stop the finger from scrolling the grid. The listener has to be
  // non-passive and registered before the touch starts, so it lives on the grid for good and only acts mid-drag.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (press.current?.active && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  const activate = (p: Press) => {
    p.active = true;
    justDragged.current = true;
    if (p.touch) navigator.vibrate?.(12);
    setDrag({ id: p.item.id, mode: p.mode, target: computeTarget(p) });
  };

  function onMove(e: PointerEvent) {
    const p = press.current;
    if (!p || e.pointerId !== p.pointerId) return;
    last.current = { x: e.clientX, y: e.clientY };
    const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
    if (!p.active) {
      if (p.touch) {
        if (moved > 8) endPress(); // it's a scroll, not a long press
        return;
      }
      if (moved > 4) activate(p);
      return;
    }
    setDrag({ id: p.item.id, mode: p.mode, target: computeTarget(p) });
  }

  function onUp(e: PointerEvent) {
    const p = press.current;
    if (!p || e.pointerId !== p.pointerId) return;
    if (p.active) {
      last.current = { x: e.clientX, y: e.clientY };
      const t = computeTarget(p);
      drop(p, t);
      setDrag(null);
      window.setTimeout(() => (justDragged.current = false), 0);
    }
    endPress();
  }

  function onCancel() {
    if (press.current?.active) setDrag(null);
    justDragged.current = false;
    endPress();
  }

  handlers.current = { move: onMove, up: onUp, cancel: onCancel };

  const drop = (p: Press, t: Target | null) => {
    if (!t) return;
    const found = findItem(doc, p.item.id);
    if (!found) return;
    const name = itemName(p.item, places);
    if (p.mode === 'resize') {
      if (t.len !== gridMinutes(p.item, places).minutes) change(`${name}: ${minutesText(t.len)}`, updateItem(p.item.id, { durationMin: t.len }));
      return;
    }
    const start = t.start == null ? null : fromMinutes(t.start);
    if (start === p.item.start && t.date === found.day.date) return;
    change(start ? `${name} → ${short(t.date)}, ${start}` : `${name} → ${short(t.date)}, fără oră`, scheduleItem(p.item.id, t.date, start));
  };

  const begin = (e: ReactPointerEvent, item: Item, mode: Press['mode']) => {
    if (e.button !== 0 || press.current) return;
    const touch = e.pointerType !== 'mouse';
    if (item.fixed) return; // fixed times don't drag; a long press opens the menu instead
    const at = pointAt(e.clientX, e.clientY);
    const start = item.start ? toMinutes(item.start) : null;
    const len = Math.max(gridMinutes(item, places).minutes, item.kind === 'deadline' ? 0 : SNAP_MIN);
    const p: Press = {
      item,
      mode,
      pointerId: e.pointerId,
      touch,
      x: e.clientX,
      y: e.clientY,
      grab: start != null && at && !at.tray ? clamp(at.minute - start, 0, len) : Math.min(len, 30) / 2,
      len,
      active: false,
      timer: null,
    };
    last.current = { x: e.clientX, y: e.clientY };
    press.current = p;
    if (touch) p.timer = window.setTimeout(() => press.current === p && activate(p), LONG_PRESS_MS);
    window.addEventListener('pointermove', listeners.move);
    window.addEventListener('pointerup', listeners.up);
    window.addEventListener('pointercancel', listeners.cancel);
  };

  useEffect(() => endPress, [endPress]);

  // swipe left / right anywhere on the grid (finger or mouse) to change page; a drag of an activity wins
  const swipe = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const onSwipeDown = (e: ReactPointerEvent) => {
    swipe.current = e.button === 0 && e.isPrimary ? { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId } : null;
  };
  const onSwipeUp = (e: ReactPointerEvent) => {
    const sw = swipe.current;
    swipe.current = null;
    if (!sw || sw.id !== e.pointerId || justDragged.current || press.current?.active) return;
    const dx = e.clientX - sw.x;
    const dy = e.clientY - sw.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy) && Date.now() - sw.t < 800) {
      justDragged.current = true; // so the release doesn't also count as a tap on a slot
      window.setTimeout(() => (justDragged.current = false), 0);
      onPage(dx < 0 ? 1 : -1);
    }
  };

  const cols = `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))`;
  const untimedOf = (d: Day) => d.items.filter((i) => !i.start);
  const maxUntimed = Math.max(0, ...days.map((d) => untimedOf(d).length));
  const trayLimit = trayOpen ? Infinity : narrow ? 2 : 3;
  const dragItem = drag ? findItem(doc, drag.id)?.item : undefined;
  const dragPlace = dragItem?.placeId ? places.get(dragItem.placeId) : undefined;

  return (
    <div
      ref={scrollRef}
      className="relative overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white h-[calc(100dvh-var(--off))] md:h-[calc(100dvh-var(--off-md))] min-h-[380px] select-none touch-pan-y"
      style={{ '--off': `${offset}px`, '--off-md': `${offset + 61}px` } as CSSProperties}
      onPointerDown={onSwipeDown}
      onPointerUp={onSwipeUp}
      onPointerCancel={() => (swipe.current = null)}
    >
      {/* sticky header: day names + activities without a time */}
      <div ref={headRef} className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
        <motion.div key={firstKey} className="grid" style={{ gridTemplateColumns: cols }} initial={{ x: slide * 24, opacity: 0.4 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.18 }}>
          <div />
          {days.map((d) => {
            const isToday = d.date === today;
            const sev = worstSeverity(warnings[d.date]?.filter((w) => w.severity !== 'info'));
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onDayHeader(d.date)}
                className="min-w-0 px-1 pt-2 pb-1.5 text-center border-l border-neutral-100"
                title={`${formatDateRo(d.date)} — ${d.title}`}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{weekdayName(d.date).slice(0, narrow ? 2 : 3)}</span>
                <span className={`mx-auto mt-0.5 flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold tabular-nums ${isToday ? 'bg-red-600 text-white' : 'text-neutral-900'}`}>
                  {Number(d.date.slice(8))}
                </span>
                <span className="mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: DAY_KIND[d.kind].hex }} />
                  {sev && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sev === 'error' ? 'bg-red-500' : 'bg-amber-400'}`} />}
                  {!narrow && <span className="truncate text-[11px] font-medium text-neutral-600">{d.title}</span>}
                </span>
              </button>
            );
          })}
        </motion.div>
        {(maxUntimed > 0 || drag) && (
          <div className="grid border-t border-neutral-100" style={{ gridTemplateColumns: cols }}>
            <div className="flex flex-col items-center justify-start pt-1.5 text-[9px] font-semibold uppercase leading-tight text-neutral-400 text-center">
              fără
              <br />
              oră
              {maxUntimed > trayLimit || trayOpen ? (
                <button type="button" onClick={() => setTrayOpen(!trayOpen)} aria-label={trayOpen ? 'Strânge' : 'Arată tot'} className="mt-0.5 w-7 h-7 inline-flex items-center justify-center text-neutral-500">
                  <ChevronDown size={14} className={trayOpen ? 'rotate-180' : ''} />
                </button>
              ) : null}
            </div>
            {days.map((d) => {
              const list = untimedOf(d);
              const over = drag?.target?.start === null && drag.target.date === d.date && drag.mode === 'move';
              return (
                <div key={d.date} className={`min-w-0 border-l border-neutral-100 p-0.5 space-y-0.5 min-h-[30px] ${over ? 'bg-sky-50 ring-2 ring-inset ring-sky-400' : ''}`}>
                  {list.slice(0, trayLimit).map((i) => (
                    <TrayChip key={i.id} item={i} narrow={narrow} faded={drag?.id === i.id} onOpen={onOpen} onBegin={begin} justDragged={justDragged} />
                  ))}
                  {list.length > trayLimit && (
                    <button type="button" onClick={() => setTrayOpen(true)} className="w-full text-[10px] font-semibold text-neutral-500 py-0.5">
                      +{list.length - trayLimit}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* hour grid */}
      <div className="relative grid" style={{ gridTemplateColumns: cols, height: px(DAY_MIN) }}>
        <div className="relative">
          {Array.from({ length: 23 }, (_, h) => (
            <span key={h} className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-neutral-400" style={{ top: px((h + 1) * 60) }}>
              {String(h + 1).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        <motion.div
          key={firstKey}
          ref={colsRef}
          className="relative col-span-full col-start-2 grid"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
          initial={{ x: slide * 24, opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {/* hour lines */}
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute inset-x-0 border-t border-neutral-100" style={{ top: px(h * 60) }} />
            ))}
          </div>
          {days.map((d) => (
            <DayColumn
              key={d.date}
              day={d}
              px={px}
              hourPx={hourPx}
              narrow={narrow}
              drag={drag}
              dragItem={dragItem}
              dragPlace={dragPlace}
              isToday={d.date === today}
              nowMin={nowMin}
              warnings={warnings[d.date] ?? []}
              onOpen={onOpen}
              onBegin={begin}
              justDragged={justDragged}
              onSlot={(min) => onSlot(d.date, min)}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  px,
  hourPx,
  narrow,
  drag,
  dragItem,
  dragPlace,
  isToday,
  nowMin,
  warnings,
  onOpen,
  onBegin,
  justDragged,
  onSlot,
}: {
  day: Day;
  px: (min: number) => number;
  hourPx: number;
  narrow: boolean;
  drag: GridProps['drag'];
  dragItem: Item | undefined;
  dragPlace: Place | undefined;
  isToday: boolean;
  nowMin: number;
  warnings: Warning[];
  onOpen: (id: string) => void;
  onBegin: (e: ReactPointerEvent, item: Item, mode: Press['mode']) => void;
  justDragged: React.MutableRefObject<boolean>;
  onSlot: (minute: number) => void;
}) {
  const { doc, places } = useTrip();
  const menuFor = useMenuFor(justDragged);
  const timed = day.items.filter((i) => i.start && i.kind !== 'deadline');
  const deadlines = day.items.filter((i) => i.start && i.kind === 'deadline');
  const events = timed.map((i) => {
    const start = toMinutes(i.start!);
    return { id: i.id, start, end: start + gridMinutes(i, places).minutes };
  });
  const placed = layoutColumns(events);
  const over = drag?.target && drag.target.date === day.date && drag.target.start != null ? drag.target : null;
  const closedHere = !!over && !!dragPlace?.hours?.closedWeekdays.includes(weekdayOf(day.date));

  return (
    <div
      className={`relative border-l border-neutral-100 ${isToday ? 'bg-red-50/30' : ''}`}
      onClick={(e) => {
        if (justDragged.current) return;
        const r = e.currentTarget.getBoundingClientRect();
        onSlot(clamp(Math.floor(((e.clientY - r.top) / hourPx) * 2) * 30, 0, DAY_MIN - 30));
      }}
    >
      {/* while dragging a place with opening hours: shade when it's closed */}
      {over && dragPlace?.hours && (
        <>
          {closedHere ? (
            <div className="absolute inset-0 bg-red-100/50 pointer-events-none" />
          ) : (
            dragPlace.hours.open &&
            dragPlace.hours.close && (
              <>
                <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(135deg, rgba(115,115,115,.10) 0 5px, transparent 5px 10px)', height: px(toMinutes(dragPlace.hours.open)) }} />
                <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(135deg, rgba(115,115,115,.10) 0 5px, transparent 5px 10px)', top: px(toMinutes(dragPlace.hours.close)) }} />
              </>
            )
          )}
        </>
      )}

      {/* travel around activities: own routes (there / back) or the computed transit leg */}
      {timed.flatMap((i) => {
        const start = toMinutes(i.start!);
        const end = start + gridMinutes(i, places).minutes;
        return travelAround(day, i, doc).map((t, k) => {
          const from = t.when === 'before' ? Math.max(0, start - t.minutes) : end;
          const to = t.when === 'before' ? start : Math.min(DAY_MIN, end + t.minutes);
          return (
            <div
              key={`t-${i.id}-${k}`}
              className="absolute inset-x-0.5 rounded-md pointer-events-none overflow-hidden text-[9px] font-medium text-slate-500 px-1 bg-[repeating-linear-gradient(135deg,rgba(100,116,139,0.13)_0_4px,transparent_4px_8px)]"
              style={{ top: px(from), height: px(to - from) }}
              title={`${t.label} · ${minutesText(t.minutes)}`}
            >
              {px(to - from) > 14 && !narrow && `↝ ${minutesText(t.minutes)}`}
            </div>
          );
        });
      })}

      {timed.map((i) => {
        const p = placed.get(i.id)!;
        const sev = worstSeverity(warnings.filter((w) => w.itemId === i.id && w.severity !== 'info'));
        return (
          <Block
            key={i.id}
            item={i}
            day={day}
            top={px(p.start)}
            height={Math.max(px(p.end - p.start) - 2, 18)}
            col={p.col}
            cols={p.cols}
            narrow={narrow}
            faded={drag?.id === i.id && drag.mode === 'move'}
            resizing={drag?.id === i.id && drag.mode === 'resize' ? drag.target?.len ?? null : null}
            px={px}
            severity={sev}
            onOpen={onOpen}
            onBegin={onBegin}
            justDragged={justDragged}
          />
        );
      })}

      {deadlines.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!justDragged.current) onOpen(i.id);
          }}
          onPointerDown={(e) => onBegin(e, i, 'move')}
          onContextMenu={(e) => menuFor(e, i.id)}
          className={`absolute inset-x-0 z-20 flex items-center ${drag?.id === i.id ? 'opacity-30' : ''}`}
          style={{ top: px(toMinutes(i.start!)) - 9, height: 18 }}
          title={`${i.start} ${itemName(i, places)}`}
        >
          <span className="absolute inset-x-0 top-1/2 border-t-2 border-amber-500" />
          <span className="relative ml-0.5 max-w-full truncate rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-4 text-white">
            {narrow ? i.start : `${i.start} ${itemName(i, places)}`}
          </span>
        </button>
      ))}

      {/* drop preview */}
      {over && drag?.mode === 'move' && dragItem && (
        <div
          className={`absolute inset-x-0.5 z-30 rounded-lg border-2 border-dashed pointer-events-none px-1 py-0.5 text-[10px] font-bold ${closedHere ? 'border-red-500 bg-red-50/80 text-red-700' : 'border-neutral-900 bg-white/70 text-neutral-900'}`}
          style={{ top: px(over.start!), height: Math.max(px(over.len), 18) }}
        >
          {fromMinutes(over.start!)}
          {over.len > 0 && `–${fromMinutes(over.start! + over.len)}`}
          {closedHere && ' · închis'}
        </div>
      )}

      {isToday && nowMin >= 0 && (
        <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top: px(nowMin) }}>
          <div className="relative border-t-2 border-red-500">
            <span className="absolute -left-1 -top-[5px] w-2 h-2 rounded-full bg-red-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function Block({
  item,
  day,
  top,
  height,
  col,
  cols,
  narrow,
  faded,
  resizing,
  px,
  severity,
  onOpen,
  onBegin,
  justDragged,
}: {
  item: Item;
  day: Day;
  top: number;
  height: number;
  col: number;
  cols: number;
  narrow: boolean;
  faded: boolean;
  resizing: number | null;
  px: (min: number) => number;
  severity: 'error' | 'warn' | null;
  onOpen: (id: string) => void;
  onBegin: (e: ReactPointerEvent, item: Item, mode: Press['mode']) => void;
  justDragged: React.MutableRefObject<boolean>;
}) {
  const { places } = useTrip();
  const menuFor = useMenuFor(justDragged);
  const place = item.placeId ? places.get(item.placeId) : undefined;
  const color = colorOf(item, place);
  const photo = !!place?.photos[0]?.path;
  const { minutes, estimated } = gridMinutes(item, places);
  const start = toMinutes(item.start!);
  const len = resizing ?? minutes;
  const h = resizing != null ? Math.max(px(resizing) - 2, 18) : height;
  const name = itemName(item, places);
  const tiny = h < 34;
  const bookingTodo = place?.booking?.required && place.booking.status === 'todo';
  const style: CSSProperties = {
    top,
    height: h,
    left: `calc(${(col / cols) * 100}% + 2px)`,
    width: `calc(${100 / cols}% - 4px)`,
    borderLeftColor: color,
    ...(photo ? {} : { background: `${color}1f` }),
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${name}, ${item.start}–${fromMinutes(start + len)}${day.status === 'draft' ? ', propus' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!justDragged.current) onOpen(item.id);
      }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(item.id)}
      onPointerDown={(e) => onBegin(e, item, 'move')}
      onContextMenu={(e) => menuFor(e, item.id)}
      className={`group absolute z-10 overflow-hidden rounded-lg border-l-[3px] text-left shadow-sm transition-opacity [-webkit-touch-callout:none] ${
        item.fixed ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${faded ? 'opacity-35' : ''} ${item.done ? 'opacity-60' : ''} ${severity === 'error' ? 'ring-2 ring-red-500' : severity === 'warn' ? 'ring-1 ring-amber-400' : ''} ${
        resizing != null ? 'ring-2 ring-neutral-900 z-30' : ''
      } ${estimated && !photo ? 'border-b border-dashed border-b-neutral-400' : ''}`}
      style={style}
    >
      {photo && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            <PlacePhoto place={place} thumb className="h-full w-full" sizes="200px" />
          </div>
          <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,${tiny ? '.55' : '.2'}))` }} />
        </>
      )}
      <div className={`relative h-full flex flex-col ${tiny ? 'justify-center px-1' : 'px-1.5 py-1'} ${photo ? 'text-white justify-end' : 'text-neutral-900'}`}>
        {!tiny && !(narrow || cols > 1) && (
          <span className={`absolute right-1 top-1 flex items-center gap-0.5 ${photo ? 'text-white' : 'text-neutral-700'}`}>
            {severity && <AlertTriangle size={11} className={photo ? '' : severity === 'error' ? 'text-red-600' : 'text-amber-600'} />}
            {bookingTodo && <Ticket size={11} />}
            {item.fixed && <Lock size={10} />}
            {item.done && <Check size={11} />}
          </span>
        )}
        <span className={`font-semibold leading-tight ${narrow ? 'text-[10px]' : 'text-[11px]'} ${tiny ? 'truncate' : 'line-clamp-3'} ${item.done ? 'line-through' : ''} ${!tiny && !photo && !(narrow || cols > 1) ? 'pr-6' : ''}`}>
          {tiny && !narrow ? `${item.start} ${name}` : name}
        </span>
        {!tiny && (
          <span className={`text-[10px] tabular-nums leading-tight ${photo ? 'text-white/85' : 'text-neutral-600'}`}>
            {narrow ? item.start : `${item.start}–${fromMinutes(start + len)}`}
            {resizing != null && ` · ${minutesText(len)}`}
          </span>
        )}
      </div>
      {!item.fixed && (
        <div
          onPointerDown={(e) => onBegin(e, item, 'resize')}
          className="absolute inset-x-0 bottom-0 h-3 cursor-ns-resize flex items-end justify-center pb-0.5 touch-none"
          aria-hidden
        >
          <span className={`h-1 w-6 rounded-full opacity-0 group-hover:opacity-100 ${photo ? 'bg-white/80' : 'bg-neutral-500/60'} ${resizing != null ? 'opacity-100' : ''}`} />
        </div>
      )}
    </div>
  );
}

function TrayChip({
  item,
  narrow,
  faded,
  onOpen,
  onBegin,
  justDragged,
}: {
  item: Item;
  narrow: boolean;
  faded: boolean;
  onOpen: (id: string) => void;
  onBegin: (e: ReactPointerEvent, item: Item, mode: Press['mode']) => void;
  justDragged: React.MutableRefObject<boolean>;
}) {
  const { places } = useTrip();
  const menuFor = useMenuFor(justDragged);
  const place = item.placeId ? places.get(item.placeId) : undefined;
  const color = colorOf(item, place);
  const name = itemName(item, places);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (!justDragged.current) onOpen(item.id);
      }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(item.id)}
      onPointerDown={(e) => onBegin(e, item, 'move')}
      onContextMenu={(e) => menuFor(e, item.id)}
      title={name}
      className={`flex items-center gap-1 rounded-md border-l-[3px] pr-1 h-[22px] overflow-hidden cursor-grab [-webkit-touch-callout:none] ${faded ? 'opacity-35' : ''} ${item.done ? 'opacity-60' : ''}`}
      style={{ borderLeftColor: color, background: `${color}1f` }}
    >
      {place?.photos[0]?.path && <PlacePhoto place={place} thumb className="w-[18px] h-[18px] rounded-[4px] flex-shrink-0 pointer-events-none" sizes="18px" />}
      {!(narrow && place?.photos[0]?.path) && (
        <span className={`truncate font-semibold text-neutral-800 ${narrow ? 'text-[9px]' : 'text-[11px]'} ${item.done ? 'line-through' : ''}`}>{name}</span>
      )}
    </div>
  );
}

/** Agenda — every day as a list with photos, times and the activities still without a time. */
function Agenda({ anchor, onOpen }: { anchor: string; onOpen: (id: string) => void }) {
  const { doc, places, today } = useTrip();
  const menuFor = useMenuFor();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector(`[data-day="${anchor}"]`)?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when opening the agenda or picking a day
  }, [anchor]);
  return (
    <div ref={ref} className="space-y-4">
      {doc.days.map((d) => {
        const items = [...d.items].sort((a, b) => (a.start ? toMinutes(a.start) : 1e4) - (b.start ? toMinutes(b.start) : 1e4));
        return (
          <section key={d.date} data-day={d.date} className="scroll-mt-20">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className={`text-sm font-bold ${d.date === today ? 'text-red-600' : ''}`}>{short(d.date)}</span>
              <span className="w-1.5 h-1.5 rounded-full self-center" style={{ background: DAY_KIND[d.kind].hex }} />
              <Link href={dayHref(d.date)} className="text-sm text-neutral-600 truncate hover:underline">
                {d.title}
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-neutral-400 pl-1">Nimic programat.</p>
            ) : (
              <ul className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100 overflow-hidden">
                {items.map((i) => {
                  const place = i.placeId ? places.get(i.placeId) : undefined;
                  const { minutes, estimated } = gridMinutes(i, places);
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(i.id)}
                        onContextMenu={(e) => menuFor(e, i.id)}
                        className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-neutral-50 select-none [-webkit-touch-callout:none]"
                      >
                        <span className="w-[74px] flex-shrink-0 text-xs font-semibold tabular-nums text-neutral-700">
                          {i.start ? (i.kind === 'deadline' ? i.start : `${i.start}–${fromMinutes(toMinutes(i.start) + minutes)}`) : <span className="text-neutral-400">fără oră</span>}
                        </span>
                        {place?.photos[0]?.path ? (
                          <PlacePhoto place={place} thumb className="w-11 h-11 rounded-lg flex-shrink-0" sizes="44px" />
                        ) : (
                          <span className="w-11 h-11 rounded-lg flex-shrink-0 inline-flex items-center justify-center" style={{ background: `${colorOf(i, place)}26`, color: colorOf(i, place) }}>
                            {place?.booking?.required && place.booking.status === 'todo' ? <Ticket size={18} /> : <CalendarDays size={18} />}
                          </span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-semibold leading-tight ${i.done ? 'line-through text-neutral-500' : ''}`}>{itemName(i, places)}</span>
                          <span className="block text-xs text-neutral-500">
                            {i.kind === 'deadline' ? 'limită fixă' : `${estimated ? '~' : ''}${minutesText(minutes)}`}
                            {i.fixed && ' · oră fixă'}
                          </span>
                        </span>
                        {i.done && <Check size={16} className="text-green-600" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** The activity menu (right click / long press): details or remove from the plan (undoable). */
function ItemMenu({ id, x, y, onClose, onOpen, onRemove }: { id: string; x: number; y: number; onClose: () => void; onOpen: () => void; onRemove: () => void }) {
  const { doc, places } = useTrip();
  const found = findItem(doc, id);
  useEffect(() => {
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);
  if (!found) return null;
  const W = 220;
  const left = clamp(x, 8, window.innerWidth - W - 8);
  const top = clamp(y, 8, window.innerHeight - 140);
  const name = itemName(found.item, places);
  return (
    <div className="fixed inset-0 z-[900]" onPointerDown={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())}>
      <div
        role="menu"
        className="absolute rounded-xl border border-neutral-200 bg-white shadow-xl py-1 text-sm"
        style={{ left, top, width: W }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="px-3 pt-1.5 pb-1 text-xs font-semibold text-neutral-500 truncate">
          {name}
          {found.item.start ? ` · ${found.item.start}` : ''}
        </p>
        <button type="button" role="menuitem" onClick={() => (onOpen(), onClose())} className="w-full flex items-center gap-2 px-3 min-h-[40px] text-left hover:bg-neutral-50">
          <Info size={15} /> Detalii
        </button>
        <button type="button" role="menuitem" onClick={() => (onRemove(), onClose())} className="w-full flex items-center gap-2 px-3 min-h-[40px] text-left text-red-700 hover:bg-red-50">
          <Trash2 size={15} /> Scoate din program
        </button>
      </div>
    </div>
  );
}
