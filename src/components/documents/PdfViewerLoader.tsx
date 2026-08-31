'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/**
 * pdfjs-dist's browser build assumes `window`/`document` exist at module
 * evaluation time. Next.js still executes a Client Component's module body
 * once during the server render pass to produce the initial HTML (`'use
 * client'` only controls hydration, not whether the module runs on the
 * server at all) — which is exactly what was throwing "Object.defineProperty
 * called on non-object" from pdfjs-dist's pdf.mjs on every /documents/[slug]
 * request. `next/dynamic` with `ssr: false` is the standard fix: it defers
 * importing (and therefore evaluating) PdfViewer.tsx — and everything it
 * pulls in — until the browser, never on the server. `ssr: false` can only
 * be used from inside a Client Component boundary, which is the only reason
 * this thin wrapper exists rather than calling `dynamic()` directly in the
 * page.tsx Server Component.
 */
const PdfViewer = dynamic(() => import('./PdfViewer').then((mod) => mod.PdfViewer), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-24 text-token-text-muted">
      <Loader2 size={28} className="animate-spin" />
    </div>
  ),
});

export { PdfViewer as PdfViewerLoader };
