'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Document, Page, pdfjs } from 'react-pdf';
import type { DocumentProps } from 'react-pdf';
// AnnotationLayer.css / TextLayer.css are imported from PdfViewerLoader.tsx,
// not here — see that file's comment for why.
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize,
  Minimize,
  Search,
  X,
  Globe,
  Mail,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useScrollDirection } from '../../hooks/useScrollDirection';

// Self-hosted rather than pulled from a CDN — reliability/perf requirement,
// and it keeps the worker version pinned to exactly what react-pdf ships
// (copied into public/ by scripts/copy-pdf-worker.js on every install).
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type PDFDocumentProxy = NonNullable<Parameters<NonNullable<DocumentProps['onLoadSuccess']>>[0]>;

interface PdfViewerProps {
  fileUrl: string;
  slug: string;
  title: string;
  /** Shown in place of the plain loading spinner while the PDF itself is
   *  still fetching/parsing — gives the visitor an immediate sense of the
   *  document instead of a blank wait. */
  thumbnailUrl?: string | null;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;
const RENDER_WINDOW = 2; // pages beyond the current one to keep mounted, each direction
const MAX_CONTENT_WIDTH = 860; // caps page width on very wide screens for readability

export function PdfViewer({ fileUrl, slug, title, thumbnailUrl }: PdfViewerProps) {
  // The element that actually gets fullscreened. Deliberately its own ref
  // (not derived from containerRef.parentElement) so it's an explicit,
  // stable target for both requestFullscreen() and — while fullscreened —
  // scroll tracking: a fullscreened element becomes its own scroll box,
  // completely separate from the window, so every piece of scroll logic
  // below (reading progress, the toolbar's hide-on-scroll, and which pages
  // are "current") has to know to target it instead of window in that state.
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const pageElRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  // Pages that have been rendered at least once. Additive only — a page
  // never leaves this set once it's in it, so scrolling away and back never
  // re-renders it from scratch (no repeat spinner, no flash of blank page).
  // Still lazy: a page is only added when it first comes within
  // RENDER_WINDOW of the current page, not all at once on load.
  const [renderedPages, setRenderedPages] = useState<Set<number>>(() => new Set());
  // A page enters `renderedPages` as soon as react-pdf mounts it, but
  // react-pdf's own Canvas.js sets canvas.style.visibility = 'hidden' for
  // the entire span it's actually painting, only clearing that once
  // rendering finishes — the `loading` prop below only covers the earlier
  // page-data-fetch phase, not this one. Without tracking it separately, the
  // wrapper's own background shows through during that gap; sticky/additive
  // like renderedPages, for the same reason (once painted, a page's canvas
  // fully covers its wrapper again on any later re-render, so there's
  // nothing to gain by ever removing it).
  const [canvasReady, setCanvasReady] = useState<Set<number>>(() => new Set());
  const markCanvasReady = useCallback((n: number) => {
    setCanvasReady((prev) => (prev.has(n) ? prev : new Set(prev).add(n)));
  }, []);
  const [pageInput, setPageInput] = useState('1');
  const [nativeSize, setNativeSize] = useState<{ width: number; height: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [zoomAdjust, setZoomAdjust] = useState(1);
  // The scale actually passed to <Page> — deliberately lags zoomAdjust by a
  // short debounce. Every page currently mounted re-rasterizes its canvas
  // whenever this changes, which is real, visible work; committing it on
  // every individual +/- click (or worse, every keydown from holding
  // Cmd/Ctrl and tapping repeatedly) made zooming feel like the whole
  // document was reloading. zoomAdjust itself still updates instantly for
  // the % label and for the CSS-transform "live" preview below — only the
  // expensive part waits.
  const [committedZoom, setCommittedZoom] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<number | null>(null); // 0-1, or null when unknown
  const [scrollProgress, setScrollProgress] = useState(0); // 0-1, whole-document read progress
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchRan, setSearchRan] = useState(false);

  // Passing rootRef only while actually fullscreen: that's the one case
  // where the toolbar needs to track a specific element's scroll instead of
  // the window's.
  const toolbarHidden = useScrollDirection(768, 80, isFullscreen ? rootRef.current : null);

  // Keeps the page-jump input in sync when currentPage changes from scrolling.
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Grows the rendered-pages set as the user scrolls — never shrinks it.
  useEffect(() => {
    if (!numPages) return;
    setRenderedPages((prev) => {
      const next = new Set(prev);
      let changed = false;
      const lo = Math.max(1, currentPage - RENDER_WINDOW);
      const hi = Math.min(numPages, currentPage + RENDER_WINDOW);
      for (let n = lo; n <= hi; n++) {
        if (!next.has(n)) {
          next.add(n);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentPage, numPages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Toolbar's own height, so fit-to-height can subtract it from the
  // available viewport instead of guessing a fixed number.
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const measure = () => setToolbarHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const measure = () => setViewportHeight(window.innerHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Whole-document read progress, driven by actual scroll position rather
  // than page count — smooth and continuous instead of jumping in
  // per-page steps. Renders as a thin bar under the toolbar.
  //
  // Normally the whole page scrolls (window) — the more native feel on
  // mobile, and what the toolbar's own scroll-hide behaviour assumes. But a
  // fullscreened element becomes its own scroll box, entirely separate from
  // window scroll, so while fullscreen this has to track rootRef itself
  // instead — otherwise scrolling inside fullscreen does nothing at all,
  // since window never receives those scroll events.
  useEffect(() => {
    const target: HTMLElement | Window = isFullscreen && rootRef.current ? rootRef.current : window;

    const onScroll = () => {
      const scrollTop = isFullscreen && rootRef.current ? rootRef.current.scrollTop : window.scrollY;
      const scrollHeight = isFullscreen && rootRef.current ? rootRef.current.scrollHeight : document.documentElement.scrollHeight;
      const viewport = isFullscreen && rootRef.current ? rootRef.current.clientHeight : window.innerHeight;
      const scrollable = scrollHeight - viewport;
      const progress = scrollable > 0 ? scrollTop / scrollable : 0;
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };

    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [numPages, isFullscreen]);

  // One IntersectionObserver, watching the browser viewport by default, or
  // the fullscreen container's own box while fullscreen (an
  // IntersectionObserver's root has to be an actual scrolling ancestor —
  // `null` means "the viewport", which stops being true once a descendant
  // element, not the window, is what's actually scrolling).
  // Individual page wrappers register/unregister themselves as they mount
  // and unmount through the render window below.
  useEffect(() => {
    if (!numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestPage: number | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          const n = Number(entry.target.getAttribute('data-page-number'));
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestPage = n;
          }
        }
        if (bestPage && bestRatio > 0.1) {
          setCurrentPage(bestPage);
        }
      },
      {
        root: isFullscreen ? rootRef.current : null,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        rootMargin: '0px 0px -20% 0px',
      }
    );

    observerRef.current = observer;
    pageElRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages, isFullscreen]);

  const registerPageRef = useCallback(
    (pageNumber: number) => (el: HTMLDivElement | null) => {
      const prev = pageElRefs.current.get(pageNumber);
      if (prev && observerRef.current) observerRef.current.unobserve(prev);

      if (el) {
        pageElRefs.current.set(pageNumber, el);
        observerRef.current?.observe(el);
      } else {
        pageElRefs.current.delete(pageNumber);
      }
    },
    []
  );

  const onDocumentLoadSuccess = useCallback(async (pdf: PDFDocumentProxy) => {
    pdfRef.current = pdf;
    setNumPages(pdf.numPages);
    setLoadError(null);
    try {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      setNativeSize({ width: viewport.width, height: viewport.height });
    } catch {
      // Rendering can still proceed with a default placeholder size.
    }
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setLoadError('This document could not be loaded. It may be corrupted or temporarily unavailable.');
  }, []);

  // Real byte-level progress when the server sends a Content-Length; falls
  // back to null (→ a spinner instead of a progress line) when it can't be
  // known, e.g. a chunked/streamed response with no total.
  const onDocumentLoadProgress = useCallback(({ loaded, total }: { loaded: number; total: number }) => {
    setLoadProgress(total > 0 ? Math.min(1, loaded / total) : null);
  }, []);

  // Base (100%) scale fits the page within BOTH the container's width and
  // the visible viewport height, whichever is more restrictive — not width
  // alone. On a typical tall phone viewing a portrait page, width is
  // usually the binding constraint and this is a no-op; on a wide-but-short
  // viewport (landscape phone/tablet, a short browser window) a portrait
  // page would otherwise render taller than the screen, so height takes
  // over and the page opens already shrunk to fit (roughly 50% on a
  // landscape screen showing a portrait page, as it should).
  const baseScale = useMemo(() => {
    if (!containerWidth || !nativeSize) return 1;

    const fitWidth = Math.min(containerWidth - 16, MAX_CONTENT_WIDTH) / nativeSize.width;

    if (!viewportHeight) return fitWidth;
    const availableHeight = viewportHeight - toolbarHeight - 48; // 48 = page's own vertical breathing room
    const fitHeight = availableHeight / nativeSize.height;

    return Math.min(fitWidth, fitHeight > 0 ? fitHeight : fitWidth);
  }, [containerWidth, nativeSize, viewportHeight, toolbarHeight]);

  // Commits zoomAdjust into committedZoom ~220ms after it stops changing —
  // long enough to absorb a burst of clicks/keypresses into one real
  // re-render instead of one per step.
  useEffect(() => {
    const t = setTimeout(() => setCommittedZoom(zoomAdjust), 220);
    return () => clearTimeout(t);
  }, [zoomAdjust]);

  const scale = baseScale * committedZoom; // passed to <Page> — the real, rasterized scale
  // baseScale cancels out of this ratio, so window resizes (which move
  // baseScale) never produce a spurious transform — only an actual zoomAdjust
  // change (a real +/- press) ever pushes this away from 1.
  const liveZoomRatio = committedZoom > 0 ? zoomAdjust / committedZoom : 1;

  const goToPage = useCallback((n: number) => {
    const el = pageElRefs.current.get(n);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.min(Math.max(1, parseInt(pageInput, 10) || 1), numPages);
    setPageInput(String(n));
    goToPage(n);
  };

  const handleZoomIn = useCallback(
    () => setZoomAdjust((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))),
    []
  );
  const handleZoomOut = useCallback(
    () => setZoomAdjust((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))),
    []
  );

  // Cmd/Ctrl +/- zoom the PDF instead of the whole browser page. This entire
  // route is the viewer (chromeless — see isChromelessRoute.ts), so a
  // window-level listener for the component's lifetime is exactly "while in
  // the renderer"; there's no other page content it could steal the shortcut
  // from. '=' is included alongside '+' since that's the unshifted key that
  // actually fires for Cmd/Ctrl+Plus on most keyboard layouts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleZoomIn, handleZoomOut]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleDownload = async () => {
    // iOS Safari can't reliably trigger a real file-system save via a blob +
    // <a download> — instead of saving, it typically just opens the blob in
    // its own fullscreen Quick Look-style preview, which is exactly the
    // symptom this works around. There's no JS-only way to force an actual
    // save on iOS Safari (sandboxing, not a bug in this code); opening the
    // real file in a new tab lets Safari's native PDF viewer take over,
    // where the share/download icon in its own toolbar does the real save.
    const iOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (iOS) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setDownloading(true);
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // A failed download shouldn't break the viewer — the user can still
      // fall back to opening the file directly.
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    const pdf = pdfRef.current;
    if (!query || !pdf) return;

    setSearching(true);
    setSearchRan(true);
    try {
      const matches: number[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase();
        if (text.includes(query)) matches.push(n);
      }
      setSearchMatches(matches);
      setSearchIndex(0);
      if (matches.length > 0) goToPage(matches[0]);
    } finally {
      setSearching(false);
    }
  };

  const goToMatch = (direction: 1 | -1) => {
    if (searchMatches.length === 0) return;
    const next = (searchIndex + direction + searchMatches.length) % searchMatches.length;
    setSearchIndex(next);
    goToPage(searchMatches[next]);
  };

  const highlightMatches = useCallback(
    (text: string) => {
      const query = searchQuery.trim();
      if (!query) return text;
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-primary-200 text-text-primary">$1</mark>');
    },
    [searchQuery]
  );

  const pageNumbers = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);
  const estimatedHeight = nativeSize ? nativeSize.height * scale : 600;
  const estimatedWidth = nativeSize ? nativeSize.width * scale : undefined;

  return (
    <div
      ref={rootRef}
      className={
        isFullscreen
          ? 'relative h-full w-full overflow-y-auto bg-surface-sunken'
          : 'relative'
      }
    >
      <div
        ref={toolbarRef}
        className={`sticky top-0 z-30 transition-transform duration-300 ease-out ${
          toolbarHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="bg-white/95 backdrop-blur border-b border-border-default shadow-token-raised">
          <div className="mx-auto max-w-5xl px-1.5 sm:px-4 py-1.5 sm:py-2 flex flex-nowrap items-center gap-0.5 sm:gap-2 overflow-x-auto">
            {/* Page navigation */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 sm:p-2 rounded-token-md text-token-text-secondary hover:bg-primary-50 hover:text-primary-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 text-sm">
                <input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={handlePageInputSubmit}
                  inputMode="numeric"
                  aria-label="Page number"
                  className="w-8 sm:w-10 text-center rounded-token-md border border-border-default py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-token-text-muted whitespace-nowrap">/ {numPages || '—'}</span>
              </form>
              <button
                type="button"
                aria-label="Next page"
                onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
                className="p-1.5 sm:p-2 rounded-token-md text-token-text-secondary hover:bg-primary-50 hover:text-primary-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="w-px h-6 bg-border-default hidden sm:block" />

            {/* Zoom */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={handleZoomOut}
                disabled={zoomAdjust <= MIN_ZOOM}
                className="p-1.5 sm:p-2 rounded-token-md text-token-text-secondary hover:bg-primary-50 hover:text-primary-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ZoomOut size={18} />
              </button>
              <span className="hidden sm:inline text-sm text-token-text-muted w-12 text-center tabular-nums">
                {Math.round((zoomAdjust / 1) * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={handleZoomIn}
                disabled={zoomAdjust >= MAX_ZOOM}
                className="p-1.5 sm:p-2 rounded-token-md text-token-text-secondary hover:bg-primary-50 hover:text-primary-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ZoomIn size={18} />
              </button>
            </div>

            <div className="w-px h-6 bg-border-default hidden sm:block" />

            {/* Search */}
            <button
              type="button"
              aria-label="Search in document"
              onClick={() => setSearchOpen((v) => !v)}
              className={`p-1.5 sm:p-2 rounded-token-md transition-colors flex-shrink-0 ${
                searchOpen ? 'bg-primary-100 text-primary-600' : 'text-token-text-secondary hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              <Search size={18} />
            </button>

            <button
              type="button"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-token-md text-token-text-secondary hover:bg-primary-50 hover:text-primary-600 transition-colors flex-shrink-0"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="p-1.5 sm:p-2 rounded-token-md text-token-text-secondary hover:bg-primary-50 hover:text-primary-600 disabled:opacity-50 transition-colors flex-shrink-0"
              aria-label="Download PDF"
            >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>

            {/* Spacer pushes the branded CTAs to the right — only once there's
                room to spare (lg+); below that the toolbar is a single
                non-wrapping, scrollable row and the CTAs just sit inline
                after the other controls. */}
            <div className="flex-1 hidden lg:block" />

            {/* Icon-only through phone AND portrait-tablet widths (text only
                appears at lg, ~1024px+) — both buttons always visible,
                always on this one row, never dropping to a second line. */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto lg:ml-0">
              <a
                href="/#contact"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-3 lg:py-1.5 rounded-token-full bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
              >
                <Mail size={14} />
                <span className="hidden lg:inline">Contact</span>
              </a>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-3 lg:py-1.5 rounded-token-full bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
              >
                <Globe size={14} />
                <span className="hidden lg:inline">Website</span>
              </a>
            </div>
          </div>

          {searchOpen && (
            <div className="border-t border-border-default px-2 sm:px-4 py-2 bg-surface-sunken">
              <form onSubmit={runSearch} className="max-w-5xl mx-auto flex items-center gap-2">
                <Search size={16} className="text-token-text-muted flex-shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in this document…"
                  className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none placeholder:text-token-text-muted"
                />
                {searching && <Loader2 size={16} className="animate-spin text-token-text-muted" />}
                {!searching && searchRan && (
                  <span className="text-sm text-token-text-muted whitespace-nowrap">
                    {searchMatches.length === 0
                      ? 'No results'
                      : `${searchIndex + 1} / ${searchMatches.length}`}
                  </span>
                )}
                {searchMatches.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => goToMatch(-1)}
                      aria-label="Previous match"
                      className="p-1.5 rounded-token-md text-token-text-secondary hover:bg-primary-50 hover:text-primary-600"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToMatch(1)}
                      aria-label="Next match"
                      className="p-1.5 rounded-token-md text-token-text-secondary hover:bg-primary-50 hover:text-primary-600"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                    setSearchMatches([]);
                    setSearchRan(false);
                  }}
                  aria-label="Close search"
                  className="p-1.5 rounded-token-md text-token-text-secondary hover:bg-primary-50"
                >
                  <X size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Reading-progress line — pinned to the toolbar's bottom edge (so
              it moves with it, including the hide-on-scroll animation),
              tracking actual scroll position through the whole document.
              No percentage, just a smooth animated fill. */}
          <div className="h-[3px] bg-primary-100/60 overflow-hidden">
            <div
              className="h-full bg-primary-500 origin-left transition-transform duration-150 ease-out"
              style={{ transform: `scaleX(${scrollProgress})` }}
            />
          </div>
        </div>
      </div>

      {/* pb-24 (not just py-4's 16px): the last page's own content — e.g. a
          link near its bottom edge — needs real scroll room past it, or the
          browser clamps scrollY before the last few pixels of content (and
          anything interactive there) are ever reachable. Confirmed directly:
          a link positioned right at a last page's bottom edge had ~15px of
          its clickable area sitting beyond the max scrollable position. */}
      <div ref={containerRef} className="mx-auto px-2 sm:px-4 pt-4 pb-48">
        {loadError ? (
          <div className="w-full max-w-md mx-auto text-center py-16">
            <AlertCircle size={32} className="mx-auto mb-3 text-token-text-muted" />
            <p className="text-token-text-secondary">{loadError}</p>
          </div>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadProgress={onDocumentLoadProgress}
            // Hyperlinks inside the PDF open in a new tab instead of
            // navigating the viewer away.
            externalLinkTarget="_blank"
            externalLinkRel="noopener noreferrer"
            // The actual DOM parent of the page divs is this component's own
            // root element, not containerRef above it — react-pdf renders one
            // wrapping div around all pages, so the gap has to live here to
            // have any effect (it silently did nothing on containerRef,
            // which only ever had this one child to begin with).
            className="flex flex-col items-center gap-4"
            loading={
              // A modest, thumbnail-sized preview (sized by height, not
              // blown up to page width) — gives an immediate sense of the
              // document while pdf.js is still fetching/parsing the real
              // file. Real byte progress underneath when the server sends
              // Content-Length; a spinner instead when it can't be known.
              <div className="flex flex-col items-center gap-4 my-8">
                <div className="relative h-80 sm:h-[28rem] rounded-token-md overflow-hidden shadow-token-raised bg-surface-sunken">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt=""
                      width={460}
                      height={600}
                      className="h-full w-auto object-contain"
                      priority
                    />
                  ) : (
                    <div className="h-full aspect-[3/4]" />
                  )}
                </div>
                {loadProgress !== null ? (
                  <div className="w-56 h-2 rounded-token-full bg-primary-100 overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-token-full transition-[width] duration-150 ease-out"
                      style={{ width: `${Math.round(loadProgress * 100)}%` }}
                    />
                  </div>
                ) : (
                  <Loader2 size={22} className="animate-spin text-primary-500" />
                )}
              </div>
            }
          >
            {pageNumbers.map((n) => {
              const shouldRender = renderedPages.has(n);
              const painted = canvasReady.has(n);
              return (
                <div
                  key={n}
                  ref={registerPageRef(n)}
                  data-page-number={n}
                  className={`shadow-token-raised rounded-token-md overflow-hidden transition-transform duration-150 ease-out ${
                    painted ? 'bg-white' : 'bg-surface-sunken animate-pulse'
                  }`}
                  style={{
                    width: estimatedWidth,
                    minHeight: shouldRender ? undefined : estimatedHeight,
                    // Instant visual zoom via CSS transform while the real
                    // re-render is still debouncing (see committedZoom
                    // above) — the box's own reserved layout size only
                    // catches up once that commits, which is what actually
                    // redraws the canvas at the new resolution.
                    transform: liveZoomRatio !== 1 ? `scale(${liveZoomRatio})` : undefined,
                    transformOrigin: 'top center',
                  }}
                >
                  {shouldRender ? (
                    <Page
                      pageNumber={n}
                      scale={scale}
                      renderAnnotationLayer
                      renderTextLayer
                      onRenderSuccess={() => markCanvasReady(n)}
                      customTextRenderer={
                        searchQuery && searchMatches.includes(n) ? (props) => highlightMatches(props.str) : undefined
                      }
                      loading={
                        <div
                          style={{ width: estimatedWidth, height: estimatedHeight }}
                          className="bg-surface-sunken animate-pulse"
                        />
                      }
                    />
                  ) : (
                    // Not yet within the visual render window — the canvas
                    // paint is deliberately windowed/lazy for performance,
                    // but its links shouldn't have to wait on that: a second,
                    // lightweight Page instance with renderMode="none" skips
                    // the expensive canvas rasterization entirely and renders
                    // only the (real, positioned) annotation layer — on a
                    // slow/malformed file where canvas painting can take a
                    // long time, this is what makes a page's links clickable
                    // as soon as its annotation data resolves, independent of
                    // when its visual content actually finishes painting. The
                    // skeleton pulse sits on top, pointer-events-none so
                    // clicks pass through to the real links beneath it —
                    // visually identical to before, just with working links
                    // underneath instead of nothing.
                    <div className="relative" style={{ width: estimatedWidth, height: estimatedHeight }}>
                      <Page
                        pageNumber={n}
                        scale={scale}
                        renderMode="none"
                        renderTextLayer={false}
                        renderAnnotationLayer
                      />
                      <div
                        style={{ width: estimatedWidth, height: estimatedHeight }}
                        className="absolute inset-0 bg-surface-sunken animate-pulse pointer-events-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </Document>
        )}
      </div>
    </div>
  );
}
