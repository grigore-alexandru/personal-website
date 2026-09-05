/**
 * Types for the PDF documents feature (`alexandrugrigore.com/documents/<slug>`).
 *
 * Wire format is snake_case (Supabase); everything above `documentsService`
 * speaks camelCase. The mapping lives in `src/utils/documentsService.ts`.
 */

export type DocumentAccessLevel = 'public' | 'password';

/** The only uploadable format today is 'pdf'. 'docx' exists on the type now
 *  so the admin UI has an honest format badge to render, but no upload path
 *  produces it yet — see DocumentFileUpload.tsx / validateDocumentFile. */
export type DocumentFileType = 'pdf' | 'docx';

export interface Document {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileSizeBytes: number | null;
  pageCount: number | null;
  tags: string[] | null;
  accessLevel: DocumentAccessLevel;
  fileType: DocumentFileType;
  /** Unpublish without deleting: false 404s the public route and drops the
   *  document from the sitemap, but leaves the row (and its storage
   *  objects) intact for admin reactivation. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Fields required to create a document. The DB fills in everything else. */
export interface NewDocumentInput {
  slug: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  thumbnailUrl?: string | null;
  fileSizeBytes?: number | null;
  pageCount?: number | null;
  tags?: string[] | null;
  fileType?: DocumentFileType;
}

/** Any subset of a document's mutable fields. `slug` is deliberately absent —
 *  it is immutable once created, exactly like `LinkPatch`: changing it would
 *  break every shared link and printed QR code pointing at it. Replacing the
 *  file itself is a distinct operation (re-upload + this same patch shape for
 *  fileUrl/thumbnailUrl/fileSizeBytes/pageCount), not a separate field. */
export type DocumentPatch = Partial<
  Pick<
    Document,
    | 'title'
    | 'description'
    | 'tags'
    | 'fileUrl'
    | 'thumbnailUrl'
    | 'fileSizeBytes'
    | 'pageCount'
    | 'fileType'
    | 'isActive'
  >
>;

/** Field-level validation errors, keyed by form field name. */
export type DocumentFormErrors = Partial<Record<'title' | 'slug' | 'description' | 'file', string>>;
