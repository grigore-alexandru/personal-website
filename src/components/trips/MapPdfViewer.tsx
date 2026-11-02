'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, Maximize, Minus, Plus, X } from 'lucide-react';
import { loadMap, type MapPdf } from './offlineMaps';

// Same worker as the site's document viewer; the service worker keeps a copy for offline.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ZOOMS = [1, 1.5, 2, 3, 4, 6];
/** Phones refuse canvases much larger than this; the page is drawn once at this sharpness and zoomed with CSS. */
const MAX_CANVAS_PX = 4096;

/** A one-page map, full screen: fits the width, zooms with the buttons or by pinching, pans by scrolling. */
export default function MapPdfViewer({ doc, onClose }: { doc: MapPdf; onClose: () => void }) {
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [failed, setFailed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [zoomAt, setZoomAt] = useState(0);
  const [box, setBox] = useState(0);
  const [ratio, setRatio] = useState(1); // page height / width
  const scroller = useRef<HTMLDivElement>(null);
  const zoom = ZOOMS[zoomAt];

  useEffect(() => {
    let gone = false;
    loadMap(doc)
      .then((b) => !gone && setBytes(b))
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [doc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Measured once: the canvas is only drawn for one width, so turning or resizing never costs a re-draw mid-zoom.
  useEffect(() => {
    setBox(scroller.current?.clientWidth ?? 0);
  }, []);

  const file = useMemo(() => (bytes ? { data: new Uint8Array(bytes.slice(0)) } : null), [bytes]);

  // Zoom around the middle of what's on screen, not the corner.
  const changeZoom = (next: number) => {
    const el = scroller.current;
    if (!el) return;
    const factor = ZOOMS[next] / zoom;
    const cx = el.scrollLeft + el.clientWidth / 2;
    const cy = el.scrollTop + el.clientHeight / 2;
    setZoomAt(next);
    requestAnimationFrame(() => {
      el.scrollLeft = cx * factor - el.clientWidth / 2;
      el.scrollTop = cy * factor - el.clientHeight / 2;
    });
  };

  const button = 'w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/10 text-white disabled:opacity-30';

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex flex-col bg-neutral-900" role="dialog" aria-modal="true" aria-label={`Harta ${doc.title}`}>
      <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-2" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={onClose} aria-label="Închide" className={button}>
          <X size={20} />
        </button>
        <p className="flex-1 min-w-0 truncate px-1 text-sm font-semibold text-white">{doc.title}</p>
        <button type="button" onClick={() => changeZoom(zoomAt - 1)} disabled={zoomAt === 0} aria-label="Micșorează" className={button}>
          <Minus size={18} />
        </button>
        <button type="button" onClick={() => changeZoom(zoomAt + 1)} disabled={zoomAt === ZOOMS.length - 1} aria-label="Mărește" className={button}>
          <Plus size={18} />
        </button>
        <button type="button" onClick={() => changeZoom(0)} disabled={zoomAt === 0} aria-label="Toată harta" className={button}>
          <Maximize size={17} />
        </button>
      </div>
      <div ref={scroller} className="relative flex-1 overflow-auto bg-white">
        {!drawn && !failed && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white text-sm text-neutral-500">
            <Loader2 size={26} className="animate-spin" />
            Se desenează harta…
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-600">Harta nu e descărcată încă. Deschide-o o dată cu internet și rămâne pe dispozitiv.</div>
        )}
        {file && box > 0 && (
          <div style={{ width: box * zoom, height: box * ratio * zoom }}>
            <div style={{ width: box, transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
              <Document file={file} loading={null} error={null} onLoadError={() => setFailed(true)}>
                <Page
                  pageNumber={1}
                  width={box}
                  devicePixelRatio={MAX_CANVAS_PX / box / Math.max(1, ratio)}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={null}
                  onLoadSuccess={(p) => setRatio(p.originalHeight / p.originalWidth)}
                  onRenderSuccess={() => setDrawn(true)}
                  onRenderError={() => setFailed(true)}
                />
              </Document>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
