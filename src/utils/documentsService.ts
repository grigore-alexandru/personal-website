import { supabase } from '../lib/supabase';
import type { Document, DocumentPatch, NewDocumentInput } from '../types/documents';

/** Columns selected everywhere a full Document is returned. */
const DOCUMENT_COLUMNS =
  'id, slug, title, description, file_url, thumbnail_url, file_size_bytes, page_count, tags, access_level, created_at, updated_at';

type DocumentRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  tags: string[] | null;
  access_level: Document['accessLevel'];
  created_at: string;
  updated_at: string;
};

function toDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    fileUrl: row.file_url,
    thumbnailUrl: row.thumbnail_url,
    fileSizeBytes: row.file_size_bytes,
    pageCount: row.page_count,
    tags: row.tags,
    accessLevel: row.access_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** camelCase patch → the snake_case column names the DB expects. */
function toRowPatch(patch: DocumentPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.fileUrl !== undefined) row.file_url = patch.fileUrl;
  if (patch.thumbnailUrl !== undefined) row.thumbnail_url = patch.thumbnailUrl;
  if (patch.fileSizeBytes !== undefined) row.file_size_bytes = patch.fileSizeBytes;
  if (patch.pageCount !== undefined) row.page_count = patch.pageCount;

  return row;
}

/** Admin list — every document, newest first. */
export async function listDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as DocumentRow[]).map(toDocument);
}

/** The public lookup — safe to call from a Server Component (page.tsx,
 *  generateMetadata, generateStaticParams), since it goes through the same
 *  isomorphic `supabase` client used by blogLoader.ts for the same purpose.
 *  Returns null (not an error) for an unknown or non-public slug, so callers
 *  can go straight to notFound(). */
export async function getDocumentBySlug(slug: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error loading document:', error);
    return null;
  }
  if (!data) return null;

  return toDocument(data as unknown as DocumentRow);
}

/** Thin wrapper for generateStaticParams — avoids pulling full rows (and
 *  therefore file URLs/descriptions) just to enumerate slugs. */
export async function listDocumentSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from('documents').select('slug');

  if (error) {
    console.error('Error loading document slugs:', error);
    return [];
  }

  return ((data ?? []) as unknown as Array<{ slug: string }>).map((row) => row.slug);
}

export async function createDocument(input: NewDocumentInput): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      file_url: input.fileUrl,
      thumbnail_url: input.thumbnailUrl ?? null,
      file_size_bytes: input.fileSizeBytes ?? null,
      page_count: input.pageCount ?? null,
      tags: input.tags ?? null,
    })
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) {
    // 23505 is the unique violation on slug. Surface it as something a person
    // can act on rather than as a Postgres constraint name.
    if (error.code === '23505') {
      throw new Error('That slug is already taken. Choose another.');
    }
    throw new Error(error.message);
  }

  return toDocument(data as unknown as DocumentRow);
}

export async function updateDocument(id: string, patch: DocumentPatch): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update(toRowPatch(patch))
    .eq('id', id)
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toDocument(data as unknown as DocumentRow);
}

/** Hard delete the row. The caller is responsible for also deleting the S4
 *  objects (deleteByUrl on fileUrl and thumbnailUrl) — this service stays a
 *  pure DB-mapping layer with no storage side effects, matching how
 *  linksService.ts and the blog/content forms keep those concerns separate. */
export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** True when the slug is free. Errors resolve to false: never claim a slug is
 *  available on the strength of a failed lookup — the DB constraint is the
 *  real gate, and a false negative here is merely annoying. */
export async function checkDocumentSlugUniqueness(slug: string, excludeId?: string): Promise<boolean> {
  try {
    let query = supabase.from('documents').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking document slug uniqueness:', error);
      return false;
    }

    return !data;
  } catch (err) {
    console.error('Error checking document slug uniqueness:', err);
    return false;
  }
}

/** Appends a cache-busting query param derived from the row's updated_at, so
 *  a replaced file (same S4 key, new bytes) isn't served stale from a CDN or
 *  browser cache. Used for the PDF URL handed to the viewer and for the
 *  og:image/twitter:image URL in generateMetadata. */
export function withCacheBust(url: string, updatedAt: string): string {
  // data: URIs have no query-string concept — appending one corrupts the
  // base64 payload outright. Only ever relevant for ad-hoc/test rows (real
  // documents always store a Mega S4 URL), but cheap to guard against.
  if (url.startsWith('data:')) return url;
  const v = new Date(updatedAt).getTime();
  return `${url}${url.includes('?') ? '&' : '?'}v=${v}`;
}
