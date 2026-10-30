'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { TripDoc, type Place } from '@/lib/trips/schema';
import type { Mutation } from '@/lib/trips/mutations';
import { commit, createCommitQueue, supabaseStore, type Snapshot } from '@/lib/trips/sync';
import { validateTrip, type Warning } from '@/lib/trips/validate';
import { nowMinutesIn, todayIn } from '@/lib/trips/time';
import { ToastContainer, type ToastData, type ToastType } from '@/components/ui/Toast';
import { CACHE_KEY, PHOTO_BUCKET, PHOTO_URL_TTL_S, POLL_MS, TRIP_ID, TRIP_TZ } from './tripConfig';

export type SyncState = 'saved' | 'saving' | 'offline' | 'cache';

type TripContext = {
  doc: TripDoc;
  places: Map<string, Place>;
  warnings: Record<string, Warning[]>;
  /** Today in San Francisco (YYYY-MM-DD), whatever the device's zone. `?azi=` overrides it for testing. */
  today: string;
  nowMin: number;
  sync: SyncState;
  online: boolean;
  /** Apply an edit locally at once and save it (compare-and-swap, replayed on conflict). */
  mutate: (m: Mutation) => boolean;
  photoUrl: (path: string | null, thumb?: boolean) => string | null;
  refreshPhotos: () => Promise<void>;
  toast: (message: string, type?: ToastType) => void;
};

const Ctx = createContext<TripContext | null>(null);

export function useTrip(): TripContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTrip outside TripProvider');
  return ctx;
}

const thumbOf = (path: string) => path.replace(/\.webp$/, '.thumb.webp');
const errorText = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e));
const isAuthError = (e: unknown) => /jwt|401|not authenticated|invalid claim/i.test(errorText(e)) || (typeof e === 'object' && e !== null && (e as { status?: number }).status === 401);

function readCache(): Snapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    const doc = TripDoc.safeParse(parsed.doc);
    return doc.success ? { doc: doc.data, hash: parsed.hash, updatedAt: parsed.updatedAt } : null;
  } catch {
    return null;
  }
}

function writeCache(snap: Snapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
  } catch {
    /* private mode / quota: the cache is only a convenience */
  }
}

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file']);

/** True while the user is typing in a text field (polled updates wait until blur). Checkboxes keep focus after a tap, so they don't count. */
const typing = () => {
  const el = typeof document !== 'undefined' ? document.activeElement : null;
  if (!el) return false;
  if (el.tagName === 'TEXTAREA') return true;
  return el.tagName === 'INPUT' && !NON_TEXT_INPUTS.has((el as HTMLInputElement).type);
};

export function TripProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const store = useMemo(() => supabaseStore(supabase), [supabase]);
  const queue = useMemo(() => createCommitQueue(), []);
  const pathname = usePathname();
  const search = useSearchParams();

  const [server, setServer] = useState<Snapshot | null>(null); // last snapshot confirmed by the database (or cache)
  const [fromCache, setFromCache] = useState(false);
  const [pending, setPending] = useState<{ id: number; m: Mutation }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [clock, setClock] = useState(() => Date.now());

  const serverRef = useRef<Snapshot | null>(null);
  const pendingRef = useRef(0);
  const heldRef = useRef<Snapshot | null>(null);
  const photosRefreshed = useRef(false);
  const nextId = useRef(1);
  const fromCacheRef = useRef(fromCache);
  fromCacheRef.current = fromCache;

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    setToasts((t) => [...t, { id: `${Date.now()}-${Math.random()}`, type, message }]);
  }, []);
  const closeToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const goLogin = useCallback(() => {
    window.location.href = `/admin/login?redirectTo=${encodeURIComponent(pathname ?? '/admin')}`;
  }, [pathname]);

  const acceptServer = useCallback((snap: Snapshot, cache = true) => {
    heldRef.current = null; // any held poll result is older than this snapshot
    serverRef.current = snap;
    setServer(snap);
    setFromCache(false);
    if (cache) writeCache(snap);
  }, []);

  const load = useCallback(async () => {
    try {
      const snap = await store.load(TRIP_ID);
      acceptServer(snap);
      setLoadError(null);
      return snap;
    } catch (e) {
      if (isAuthError(e)) goLogin();
      setLoadError(errorText(e));
      return null;
    }
  }, [store, acceptServer, goLogin]);

  // 1. Mount: cache first, then the database.
  useEffect(() => {
    setOnline(navigator.onLine);
    const cached = readCache();
    if (cached) {
      serverRef.current = cached;
      setServer(cached);
      setFromCache(true);
    }
    void load();
  }, [load]);

  // 2. Poll the hash every 20 s while visible and online; immediately on focus/online.
  const poll = useCallback(async () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine || pendingRef.current > 0) return;
    try {
      const hash = await store.loadHash(TRIP_ID);
      if (serverRef.current && hash === serverRef.current.hash) {
        if (serverRef.current && fromCacheRef.current) setFromCache(false);
        return;
      }
      const snap = await store.load(TRIP_ID);
      if (pendingRef.current > 0) return;
      const hadDoc = serverRef.current != null && !fromCacheRef.current;
      if (typing()) {
        heldRef.current = snap;
        return;
      }
      acceptServer(snap);
      if (hadDoc) toast('Actualizat de pe alt dispozitiv');
    } catch (e) {
      if (isAuthError(e)) goLogin();
    }
  }, [store, acceptServer, toast, goLogin]);

  useEffect(() => {
    const id = window.setInterval(poll, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void poll();
    const onOnline = () => {
      setOnline(true);
      void poll();
    };
    const onOffline = () => setOnline(false);
    // A polled snapshot that arrived while typing is applied once the field loses focus.
    const onFocusOut = () =>
      window.setTimeout(() => {
        // Fresh snapshot only; the edits made in the field were saved through their own commits.
        const held = heldRef.current;
        if (!typing() && held && pendingRef.current === 0) {
          acceptServer(held);
          toast('Actualizat de pe alt dispozitiv');
        }
      }, 0);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [poll, acceptServer, toast]);

  // Clock for "today" / "now" in SF.
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // 3. Mutate: optimistic view = pending edits replayed on the last server snapshot.
  const mutate = useCallback(
    (m: Mutation): boolean => {
      const base = serverRef.current;
      if (!base) return false;
      if (!navigator.onLine) {
        toast('Ești offline — modificările nu se pot salva acum.', 'error');
        return false;
      }
      try {
        const preview = TripDoc.safeParse(m(base.doc));
        if (!preview.success) {
          toast(`Nu s-a putut salva: ${preview.error.issues.map((i) => i.message).join('; ')}`, 'error');
          return false;
        }
      } catch (e) {
        toast(errorText(e), 'error');
        return false;
      }
      const id = nextId.current++;
      pendingRef.current++;
      setPending((p) => [...p, { id, m }]);
      void queue(() => commit(store, TRIP_ID, serverRef.current!, m))
        .then((snap) => acceptServer(snap))
        .catch((e) => {
          if (isAuthError(e)) goLogin();
          toast(`Nu s-a putut salva: ${errorText(e)}`, 'error');
        })
        .finally(() => {
          pendingRef.current--;
          setPending((p) => p.filter((x) => x.id !== id));
        });
      return true;
    },
    [queue, store, acceptServer, toast, goLogin],
  );

  const doc = useMemo(() => {
    if (!server) return null;
    let d = server.doc;
    for (const { m } of pending) {
      try {
        d = m(d);
      } catch {
        /* the edit no longer applies (item moved elsewhere); the save will report it */
      }
    }
    return d;
  }, [server, pending]);

  // Photos: one batch of signed URLs (12 h) for every stored photo and its thumbnail.
  const photoPaths = useMemo(() => {
    if (!doc) return '';
    const paths = doc.places.flatMap((p) => p.photos.map((ph) => ph.path).filter((x): x is string => !!x));
    return [...new Set(paths)].sort().join('\n');
  }, [doc]);

  const signPhotos = useCallback(async () => {
    const paths = photoPaths ? photoPaths.split('\n') : [];
    if (paths.length === 0) return;
    const all = paths.flatMap((p) => [p, thumbOf(p)]);
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(all, PHOTO_URL_TTL_S);
    if (error || !data) return;
    const map = new Map<string, string>();
    for (const row of data) if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
    setPhotoUrls(map);
  }, [photoPaths, supabase]);

  useEffect(() => {
    void signPhotos();
  }, [signPhotos]);

  const refreshPhotos = useCallback(async () => {
    if (photosRefreshed.current) return;
    photosRefreshed.current = true;
    await signPhotos();
  }, [signPhotos]);

  const photoUrl = useCallback(
    (path: string | null, thumb = false) => (path ? photoUrls.get(thumb ? thumbOf(path) : path) ?? null : null),
    [photoUrls],
  );

  const override = search?.get('azi');
  const today = override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : todayIn(TRIP_TZ, new Date(clock));
  const nowMin = nowMinutesIn(TRIP_TZ, new Date(clock));

  const places = useMemo(() => new Map((doc?.places ?? []).map((p) => [p.id, p])), [doc]);
  const warnings = useMemo(() => (doc ? validateTrip(doc) : {}), [doc]);

  const sync: SyncState = !online ? 'offline' : pending.length > 0 ? 'saving' : fromCache ? 'cache' : 'saved';

  if (!doc) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        {loadError ? (
          <>
            <p className="text-neutral-800 font-semibold">Nu am putut încărca planul.</p>
            <p className="text-sm text-neutral-500 max-w-sm">{loadError}</p>
            <button onClick={() => void load()} className="mt-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium">
              Încearcă din nou
            </button>
          </>
        ) : (
          <p className="text-neutral-500 text-sm">Se încarcă planul…</p>
        )}
      </div>
    );
  }

  const value: TripContext = { doc, places, warnings, today, nowMin, sync, online, mutate, photoUrl, refreshPhotos, toast };
  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </Ctx.Provider>
  );
}
