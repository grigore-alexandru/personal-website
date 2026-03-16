import { getMegaS4PublicUrl } from './s4';
import { supabase } from './supabase';

const STORAGE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-proxy`;

export interface StorageUploadResult {
  publicUrl: string;
  bucket: string;
  key: string;
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
  const authHeader = await getAuthHeader();

  // Step 1: Ask edge function for a presigned URL (no file data sent to Supabase)
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

export function generateStorageKey(folder: string, originalName: string, suffix: string, ext: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const base = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${folder}/${timestamp}-${random}-${base}-${suffix}.${ext}`;
}

// ... keep parseStorageUrl, getSocialThumbnailUrl, deleteByUrl unchanged
```

The entire upload flow is now:
```
Browser → GET /storage-proxy?bucket=&key=  → Edge Function (generates presigned URL, no body)
Browser → PUT https://s3.mega.io/...?X-Amz-...  → Mega S4 directly (Supabase never sees the body)

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
