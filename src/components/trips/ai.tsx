'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Copy, LocateFixed, Share2, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatDateRo, fromMinutes } from '@/lib/trips/time';
import { useTrip } from './TripProvider';
import { currentPosition, type LatLng } from './geo';

/**
 * "Întreabă AI": every screen describes what it shows (useAiContext); the header button turns that
 * into a prompt and hands it to Claude (claude.ai/new?q=… opens a new chat with the prompt filled in),
 * Gemini (no documented prefill link: the prompt is copied, then Gemini opens — paste it), or the
 * phone's share sheet (pick the Claude or Gemini app there). Nothing is sent anywhere until you tap.
 */
export type AiPage = {
  /** What the screen is, e.g. "Hartă — toată călătoria". */
  title: string;
  /** Facts from the screen, one per line; the selection first. */
  lines: string[];
  /** Ready-made questions for this screen; the first is the default. */
  suggestions: string[];
  /** Position the screen already knows (map "Locația mea"), so the sheet doesn't ask again. */
  location?: LatLng | null;
};

const MAX_PROMPT = 6000; // keeps the claude.ai link comfortably under URL limits

const Ctx = createContext<{
  page: AiPage | null;
  setPage: (p: AiPage | null) => void;
} | null>(null);

export function AiProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<AiPage | null>(null);
  const value = useMemo(() => ({ page, setPage }), [page]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Register what this screen shows. Pass a fresh object each render; it is compared by content. */
export function useAiContext(page: AiPage) {
  const ctx = useContext(Ctx);
  const key = JSON.stringify(page);
  const setPage = ctx?.setPage;
  useEffect(() => {
    setPage?.(JSON.parse(key) as AiPage);
  }, [key, setPage]);
  useEffect(() => () => setPage?.(null), [setPage]);
}

export function buildPrompt(opts: { page: AiPage | null; question: string; today: string; nowMin: number; tripLines: string[]; location: LatLng | null }) {
  const { page, question, today, nowMin, tripLines, location } = opts;
  const parts = [
    'Sunt în călătorie în San Francisco (2–19 noiembrie 2026) și folosesc aplicația mea de planificare.',
    `Acum în San Francisco: ${formatDateRo(today)}, ora ${fromMinutes(nowMin)}.`,
    ...tripLines,
  ];
  if (location)
    parts.push(
      `Locația mea acum: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} (https://www.google.com/maps?q=${location.lat.toFixed(5)},${location.lng.toFixed(5)}).`,
    );
  if (page) parts.push('', `Ce văd în aplicație — ${page.title}:`, ...page.lines.map((l) => `- ${l}`));
  parts.push('', `Întrebarea mea: ${question.trim() || page?.suggestions[0] || 'Ce îmi recomanzi?'}`);
  parts.push('Răspunde scurt, în română. Pentru fiecare loc recomandat dă adresa, cât durează de unde sunt (pe jos / cu transportul) și dacă e deschis acum.');
  const text = parts.join('\n');
  return text.length > MAX_PROMPT ? `${text.slice(0, MAX_PROMPT - 1)}…` : text;
}

export function AskAiButton() {
  const ctx = useContext(Ctx);
  const { doc, today, nowMin, toast } = useTrip();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [withLocation, setWithLocation] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const page = ctx?.page ?? null;
  const pageKey = page?.title;
  const lastPage = useRef(pageKey);

  // New screen → fresh question; a screen that already knows the position shares it.
  useEffect(() => {
    if (lastPage.current !== pageKey) setQuestion('');
    lastPage.current = pageKey;
  }, [pageKey]);
  useEffect(() => {
    if (page?.location) {
      setLocation(page.location);
      setWithLocation(true);
    }
  }, [page?.location]);

  const toggleLocation = useCallback(
    async (on: boolean) => {
      setWithLocation(on);
      if (!on || location) return;
      setLocating(true);
      try {
        setLocation(await currentPosition());
      } catch (e) {
        setWithLocation(false);
        toast(e instanceof Error ? e.message : String(e), 'error');
      } finally {
        setLocating(false);
      }
    },
    [location, toast],
  );

  const tripLines = [
    doc.trip.base ? `Stau la: ${doc.trip.base.name ?? ''} ${doc.trip.base.address ?? ''}`.trim() : 'Cazarea nu e încă stabilită.',
    ...(doc.trip.notes ? [`Notele mele: ${doc.trip.notes.replace(/\n/g, ' ')}`] : []),
  ];
  const prompt = buildPrompt({
    page,
    question,
    today,
    nowMin,
    tripLines,
    location: withLocation ? location : null,
  });
  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async (silent = false) => {
    try {
      await navigator.clipboard.writeText(prompt);
      if (!silent) toast('Promptul e copiat.');
      return true;
    } catch {
      toast('Nu am putut copia — selectează textul de mai jos.', 'error');
      return false;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full bg-black text-white text-xs font-semibold"
      >
        <Sparkles size={14} /> Întreabă AI
      </button>

      {/* Portal: the sticky header uses backdrop-blur, which would trap a fixed modal inside it. */}
      {open &&
        createPortal(
          <Modal open={open} onClose={() => setOpen(false)} title="Întreabă AI" subtitle={page?.title ?? 'San Francisco'} size="md">
            <div className="space-y-3">
              {page && page.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {page.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQuestion(s)}
                      className={`text-left min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-medium ${question === s ? 'bg-black text-white border-black' : 'border-neutral-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder={page?.suggestions[0] ?? 'Ce vrei să întrebi?'}
                className="w-full rounded-xl border border-neutral-300 p-3 text-sm"
              />
              <label className="flex items-center gap-2 min-h-[40px] text-sm font-medium cursor-pointer select-none">
                <input type="checkbox" checked={withLocation} onChange={(e) => void toggleLocation(e.target.checked)} className="w-5 h-5 accent-black" />
                <LocateFixed size={16} /> Include locația mea {locating && <span className="text-xs text-neutral-500">se caută…</span>}
              </label>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={claudeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center min-h-[48px] rounded-xl bg-[#d97757] text-white font-semibold"
                >
                  Claude
                </a>
                <a
                  href="https://gemini.google.com/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void copy(true).then((ok) => ok && toast('Promptul e copiat — lipește-l în Gemini.'))}
                  className="inline-flex items-center justify-center min-h-[48px] rounded-xl bg-[#1a73e8] text-white font-semibold"
                >
                  Gemini
                </a>
                {canShare && (
                  <button
                    type="button"
                    onClick={() => void navigator.share({ text: prompt }).catch(() => undefined)}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-neutral-300 text-sm font-semibold"
                  >
                    <Share2 size={16} /> Partajează
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void copy()}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-neutral-300 text-sm font-semibold ${canShare ? '' : 'col-span-2'}`}
                >
                  <Copy size={16} /> Copiază
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                Claude se deschide cu promptul completat. Pentru Gemini promptul se copiază și îl lipești. „Partajează” deschide meniul telefonului, de unde
                poți alege aplicația Claude sau Gemini.
              </p>

              <details className="rounded-xl bg-neutral-50 p-3">
                <summary className="text-xs font-semibold text-neutral-600 cursor-pointer">Ce trimit ({prompt.length} caractere)</summary>
                <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-700 font-sans">{prompt}</pre>
              </details>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
