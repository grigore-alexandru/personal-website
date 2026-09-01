'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
// Imported here rather than in PdfViewer.tsx itself: this file is a normal
// (non-dynamic) import from the Server Component page, so its CSS ships in
// the page's main stylesheet, loaded upfront. Importing it inside
// PdfViewer.tsx — which is itself lazy-loaded via next/dynamic below — risks
// the annotation/text layer's CSS custom properties (which pdf.js checks for
// synchronously on mount, warning "styles not found" if they're missing)
// arriving after that first check runs, a real race between the code-split
// chunk's JS and CSS that a static import here sidesteps entirely.
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
