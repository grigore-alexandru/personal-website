import { getMegaS4PublicUrl } from './s4';
import { supabase } from './supabase';

const STORAGE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-proxy`;

export interface StorageUploadResult {
  publicUrl: string;
  bucket: string;
  key: string;
}

export interface StorageError {
  message: string;
  code?: string;
}

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  return `Bearer ${token}`;
}

export async function uploadBlob(
  blob: Blob,
  bucket: string,
  key: string,
  contentType: string
): Promise<StorageUploadResult> {
  const formData = new FormData();
  formData.append('file', new File([blob], key.split('/').pop() ?? 'upload', { type: contentType }));
  formData.append('bucket', bucket);
  formData.append('key', key);
  formData.append('contentType', contentType);

  const authHeader = await getAuthHeader();

  const response = await fetch(STORAGE_PROXY_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(`Storage upload failed: ${err.error ?? response.status}`);
  }

  const result = await response.json() as { publicUrl: string; bucket: string; key: string };

  return {
    publicUrl: result.publicUrl,
    bucket: result.bucket,
    key: result.key,
  };
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

export function generateStorageKey(folder: string, originalName: string, suffix: string, ext: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const base = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${folder}/${timestamp}-${random}-${base}-${suffix}.${ext}`;
}

interface ParsedStorageUrl {
  type: 'supabase' | 'mega-s4' | 'unknown';
  bucket: string;
  path: string;
}

export function parseStorageUrl(url: string): ParsedStorageUrl | null {
  if (!url) return null;

  const supabaseMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (supabaseMatch) {
    return { type: 'supabase', bucket: supabaseMatch[1], path: supabaseMatch[2] };
  }

  const megaEndpoint = import.meta.env.VITE_MEGA_S4_ENDPOINT ?? 'https://s3.eu-central-1.s4.mega.io';
  const accountId = import.meta.env.VITE_MEGA_S4_ACCOUNT_ID ?? '';

  if (url.startsWith(megaEndpoint)) {
    const rest = url.slice(megaEndpoint.length + 1);
    const parts = rest.split('/');

    if (accountId && parts[0] === accountId && parts.length >= 3) {
      const bucket = parts[1];
      const keyParts = parts.slice(2);
      return {
        type: 'mega-s4',
        bucket,
        path: decodeURIComponent(keyParts.join('/')),
      };
    }

    if (parts.length >= 2) {
      const bucket = parts[0];
      const keyParts = parts.slice(1);
      return {
        type: 'mega-s4',
        bucket,
        path: decodeURIComponent(keyParts.join('/')),
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
    if (error) {
      console.error('Supabase delete failed:', error.message);
    }
    return;
  }

  if (parsed.type === 'mega-s4') {
    await deleteObject(parsed.bucket, parsed.path);
  }
}
