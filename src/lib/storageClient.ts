import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3ServiceException } from '@aws-sdk/client-s3';
import { s4Client, getMegaS4PublicUrl } from './s4';
import { supabase } from './supabase';

export interface StorageUploadResult {
  publicUrl: string;
  bucket: string;
  key: string;
}

export interface StorageError {
  message: string;
  code?: string;
}

export async function uploadBlob(
  blob: Blob,
  bucket: string,
  key: string,
  contentType: string
): Promise<StorageUploadResult> {
  const arrayBuffer = await blob.arrayBuffer();
  const body = new Uint8Array(arrayBuffer);

  try {
    await s4Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  } catch (err) {
    if (err instanceof S3ServiceException) {
      throw new Error(`Storage upload failed [${err.name}]: ${err.message}`);
    }
    throw new Error(`Storage upload failed: ${String(err)}`);
  }

  return {
    publicUrl: getMegaS4PublicUrl(bucket, key),
    bucket,
    key,
  };
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  try {
    await s4Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    if (err instanceof S3ServiceException) {
      console.error(`Storage delete failed [${err.name}]: ${err.message}`);
      return;
    }
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
  const megaBase = megaEndpoint.replace(/\/$/, '');
  if (url.startsWith(megaBase)) {
    const rest = url.slice(megaBase.length + 1);
    const slashIdx = rest.indexOf('/');
    if (slashIdx !== -1) {
      return {
        type: 'mega-s4',
        bucket: rest.slice(0, slashIdx),
        path: decodeURIComponent(rest.slice(slashIdx + 1)),
      };
    }
  }

  const s4FallbackMatch = url.match(/s3\.[^.]+\.s4\.mega\.io\/([^/]+)\/(.+)$/);
  if (s4FallbackMatch) {
    return {
      type: 'mega-s4',
      bucket: s4FallbackMatch[1],
      path: decodeURIComponent(s4FallbackMatch[2]),
    };
  }

  return null;
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
