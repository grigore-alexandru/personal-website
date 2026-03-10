import { uploadBlob, generateStorageKey } from '../lib/storageClient';

const BLOG_IMAGES_BUCKET = 'blog-images';
const CONTENT_MEDIA_BUCKET = 'portfolio-images';

const BLOG_MAX_WIDTH   = 1000;
const BLOG_QUALITY     = 0.70;

const CONTENT_MAX_WIDTH = 1920;
const CONTENT_QUALITY   = 0.85;

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

export interface ContentImageUploadResult {
  publicUrl: string;
  key: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

function resizeAndCompress(img: HTMLImageElement, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/webp',
      quality
    );
  });
}

export async function uploadImageToSupabase(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  context: 'blog' | 'content' = 'blog'
): Promise<string> {
  try {
    onProgress?.({ progress: 0, status: 'uploading' });

    const img = await loadImage(file);

    const maxWidth = context === 'content' ? CONTENT_MAX_WIDTH : BLOG_MAX_WIDTH;
    const quality  = context === 'content' ? CONTENT_QUALITY   : BLOG_QUALITY;

    const compressed = await resizeAndCompress(img, maxWidth, quality);

    onProgress?.({ progress: 50, status: 'uploading' });

    const baseName = file.name.replace(/\.[^/.]+$/, '');

    let key: string;
    let bucket: string;

    if (context === 'content') {
      key    = generateStorageKey('content-media/images', baseName, 'main', 'webp');
      bucket = CONTENT_MEDIA_BUCKET;
    } else {
      key    = generateStorageKey('images', baseName, 'inline', 'webp');
      bucket = BLOG_IMAGES_BUCKET;
    }

    const result = await uploadBlob(compressed, bucket, key, 'image/webp');

    onProgress?.({ progress: 100, status: 'success', url: result.publicUrl });

    return result.publicUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    onProgress?.({ progress: 0, status: 'error', error: errorMessage });
    throw new Error(errorMessage);
  }
}

export async function uploadContentMainImage(
  file: File,
  onProgress?: (stage: string) => void,
): Promise<ContentImageUploadResult> {
  onProgress?.('Loading image...');
  const img = await loadImage(file);

  onProgress?.('Compressing...');
  const blob = await resizeAndCompress(img, CONTENT_MAX_WIDTH, CONTENT_QUALITY);

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const key      = generateStorageKey('content-media/images', baseName, 'main', 'webp');

  onProgress?.('Uploading...');
  const result = await uploadBlob(blob, CONTENT_MEDIA_BUCKET, key, 'image/webp');

  onProgress?.('Complete!');

  return { publicUrl: result.publicUrl, key };
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize     = 5 * 1024 * 1024;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit.',
    };
  }

  return { valid: true };
}
