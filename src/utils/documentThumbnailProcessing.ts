import { uploadBlob, deleteByUrl, getDocumentStorageKey, DOCUMENTS_BUCKET } from '../lib/storageClient';

// Imported dynamically (inside the function below), not at module scope.
// pdfjs-dist's browser build assumes `window`/`document` exist at import
// time, and this module is reachable from the admin page's component tree,
// which Next.js still executes once on the server to produce the initial
// HTML even though it's all "use client" — a static top-level import here
// reproduces the same SSR crash the PDF viewer itself hit (see
// PdfViewerLoader.tsx). Deferring the import into the event-driven function
// below means it only ever runs after a user actually picks a file, which by
// definition never happens during SSR.

// Only the site owner ever uploads through the admin panel, so this is a
// generous ceiling rather than a tight guard — real decks with embedded
// video/image assets can legitimately run large.
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const THUMBNAIL_MAX_WIDTH = 800;
const THUMBNAIL_QUALITY = 0.75;

export interface ProcessedDocumentThumbnail {
  thumbnailUrl: string;
  pageCount: number;
}

export interface FileValidationError {
  valid: false;
  error: string;
}

export interface FileValidationSuccess {
  valid: true;
}

export type FileValidationResult = FileValidationError | FileValidationSuccess;

export function validateDocumentFile(file: File): FileValidationResult {
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Only PDF files are allowed.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Renders page 1 of the given PDF to a WebP thumbnail and uploads it to the
 * `documents` bucket's `thumb/` folder at a deterministic, slug-keyed path —
 * matching the codebase's other image-thumbnail pipelines (WebP via canvas
 * toBlob), but with a deterministic rather than timestamped key, so a later
 * re-upload for the same slug overwrites in place instead of orphaning the
 * old thumbnail. Rendering directly at the target width (rather than
 * rendering full-size and resizing after, like the photo-upload pipelines
 * do) skips an unnecessary re-encode pass — pdf.js can render straight to
 * the scale we want.
 *
 * Also returns the document's total page count, so the caller can persist it
 * on the `documents` row without a second parse.
 */
export async function processAndUploadDocumentThumbnail(
  file: File,
  slug: string,
  onProgress?: (stage: string) => void
): Promise<ProcessedDocumentThumbnail> {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    onProgress?.('Reading PDF...');
    const { pdfjs } = await import('react-pdf');
    // Same self-hosted worker PdfViewer.tsx points at (see that file for why
    // it's self-hosted rather than CDN-loaded). Without this, pdfjs-dist
    // tries to fall back to a "fake worker" using a bare module specifier
    // ('pdf.worker.mjs') the browser can't resolve on its own, and fails
    // outright — GlobalWorkerOptions is shared module state, so this only
    // ever needs to be set once per pdfjs instance, but setting it here too
    // is what makes the admin upload flow work independently of whether the
    // public viewer has already run in this session.
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    onProgress?.('Rendering thumbnail...');
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = THUMBNAIL_MAX_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create blob from canvas'))),
        'image/webp',
        THUMBNAIL_QUALITY
      );
    });

    onProgress?.('Uploading thumbnail...');
    const thumbKey = getDocumentStorageKey(slug, 'thumbnail');
    const thumbResult = await uploadBlob(blob, DOCUMENTS_BUCKET, thumbKey, 'image/webp');

    onProgress?.('Complete!');

    return { thumbnailUrl: thumbResult.publicUrl, pageCount: pdf.numPages };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to process and upload document thumbnail');
  }
}

export async function deleteDocumentThumbnail(url: string | null): Promise<void> {
  await deleteByUrl(url);
}
