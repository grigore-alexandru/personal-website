import { getMegaS4PublicUrl } from './s4';
import { supabase } from './supabase';

const STORAGE_PROXY_URL = '/api/storage/presign';

export interface StorageUploadResult {
  publicUrl: string;
  bucket: string;
  key: string;
}

export interface StorageError {
  message: string;
  code?: string;
}

interface ParsedStorageUrl {
  type: 'supabase' | 'mega-s4' | 'unknown';
  bucket: string;
  path: string;
}

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return `Bearer ${token}`;
}

export async function uploadBlob(
  blob: Blob,
  bucket: string,
  key: string,
  contentType: string
): Promise<StorageUploadResult> {
  const authHeader = await getAuthHeader();

  // Step 1: Ask edge function for a presigned URL — no file data sent to Supabase
  const presignRes = await fetch(
    `${STORAGE_PROXY_URL}?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`,
    {
      method: 'GET',
      headers: { Authorization: authHeader },
    }
  );

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({ error: 'Presign failed' }));
    throw new Error(`Failed to get presigned URL: ${err.error ?? presignRes.status}`);
  }

  const { presignedUrl, publicUrl } = await presignRes.json() as {
    presignedUrl: string;
    publicUrl: string;
    bucket: string;
    key: string;
  };

  // Step 2: Upload directly from browser to Mega S4 — Supabase never touches the body
  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    throw new Error(`Storage upload failed: ${uploadRes.status} ${errText}`);
  }

  return { publicUrl, bucket, key };
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  try {
    const authHeader = await getAuthHeader();

    const response = await fetch(STORAGE_PROXY_URL, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucket, key }),
    });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
      const err = await response.json().catch(() => ({ error: 'Delete failed' }));
      console.error(`Storage delete failed: ${err.error ?? response.status}`);
    }
  } catch (err) {
    console.error(`Storage delete failed: ${String(err)}`);
  }
}

export function getPublicUrl(bucket: string, key: string): string {
  return getMegaS4PublicUrl(bucket, key);
}

export function generateStorageKey(
  folder: string,
  originalName: string,
  suffix: string,
  ext: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const base = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${folder}/${timestamp}-${random}-${base}-${suffix}.${ext}`;
}

/** The single Mega S4 bucket backing the PDF documents feature, with two
 *  subfolders: `docs/` for the PDFs and `thumb/` for their WebP thumbnails. */
export const DOCUMENTS_BUCKET = 'documents';

/**
 * Deterministic key for a document's PDF or thumbnail, keyed only by slug.
 * Unlike generateStorageKey() (which mints a unique timestamped key every
 * call, for content that's versioned by creating new rows), documents are
 * overwritten in place: re-uploading a PDF (or thumbnail) for the same slug
 * must resolve to the exact same S4 object key so the public URL never
 * changes. Cache-busting for a replaced file is handled by the caller
 * appending `?v=<updated_at>` to the URL at render/consumption time — never
 * stored in the DB.
 */
export function getDocumentStorageKey(slug: string, kind: 'pdf' | 'thumbnail'): string {
  return kind === 'pdf' ? `docs/${slug}.pdf` : `thumb/${slug}.webp`;
}

export function parseStorageUrl(url: string): ParsedStorageUrl | null {
  if (!url) return null;

  const supabaseMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (supabaseMatch) {
    return { type: 'supabase', bucket: supabaseMatch[1], path: supabaseMatch[2] };
  }

  const megaEndpoint = process.env.NEXT_PUBLIC_MEGA_S4_ENDPOINT ?? 'https://s3.eu-central-1.s4.mega.io';
  const accountId = process.env.NEXT_PUBLIC_MEGA_S4_ACCOUNT_ID ?? '';

  if (url.startsWith(megaEndpoint)) {
    const rest = url.slice(megaEndpoint.length + 1);
    const parts = rest.split('/');

    if (accountId && parts[0] === accountId && parts.length >= 3) {
      return {
        type: 'mega-s4',
        bucket: parts[1],
        path: decodeURIComponent(parts.slice(2).join('/')),
      };
    }

    if (parts.length >= 2) {
      return {
        type: 'mega-s4',
        bucket: parts[0],
        path: decodeURIComponent(parts.slice(1).join('/')),
      };
    }
  }

  const s4FallbackMatch = url.match(/s3\.[^.]+\.s4\.mega\.io\/([^/]+)\/([^/]+)\/(.+)$/);
  if (s4FallbackMatch) {
    return {
      type: 'mega-s4',
      bucket: s4FallbackMatch[2],
      path: decodeURIComponent(s4FallbackMatch[3]),
    };
  }

  const s4LegacyMatch = url.match(/s3\.[^.]+\.s4\.mega\.io\/([^/]+)\/(.+)$/);
  if (s4LegacyMatch) {
    return {
      type: 'mega-s4',
      bucket: s4LegacyMatch[1],
      path: decodeURIComponent(s4LegacyMatch[2]),
    };
  }

  return null;
}

export function getSocialThumbnailUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const parsed = parseStorageUrl(url);
  if (parsed?.type === 'supabase') {
    const base = url.split('?')[0];
    return `${base}?width=1200&quality=70&format=origin`;
  }
  return url;
}

export async function deleteByUrl(url: string | null): Promise<void> {
  if (!url) return;

  const parsed = parseStorageUrl(url);
  if (!parsed) {
    console.warn('deleteByUrl: unrecognised URL, skipping:', url);
    return;
  }

  if (parsed.type === 'supabase') {
    const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
    if (error) console.error('Supabase delete failed:', error.message);
    return;
  }

  if (parsed.type === 'mega-s4') {
    await deleteObject(parsed.bucket, parsed.path);
  }
}