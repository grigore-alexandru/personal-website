import { uploadBlob, generateStorageKey } from '../lib/storageClient';

const BLOG_IMAGES_BUCKET = 'blog-images';
const INLINE_MAX_WIDTH = 1000;
const INLINE_QUALITY = 0.70;

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
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
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    onProgress?.({ progress: 0, status: 'uploading' });

    const img = await loadImage(file);
    const compressed = await resizeAndCompress(img, INLINE_MAX_WIDTH, INLINE_QUALITY);

    onProgress?.({ progress: 50, status: 'uploading' });

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const key = generateStorageKey('images', baseName, 'inline', 'webp');
    const result = await uploadBlob(compressed, BLOG_IMAGES_BUCKET, key, 'image/webp');

    onProgress?.({ progress: 100, status: 'success', url: result.publicUrl });

    return result.publicUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    onProgress?.({ progress: 0, status: 'error', error: errorMessage });
    throw new Error(errorMessage);
  }
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024;
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
