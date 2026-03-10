import { uploadBlob, deleteByUrl, generateStorageKey } from '../lib/storageClient';

const CONTENT_MEDIA_BUCKET = 'content-media';
const MAX_FILE_SIZE = 7 * 1024 * 1024;
const FULL_IMAGE_MAX_WIDTH_LANDSCAPE = 1920;
const FULL_IMAGE_MAX_WIDTH_PORTRAIT = 1080;
const THUMBNAIL_MAX_WIDTH_LANDSCAPE = 400;
const THUMBNAIL_MAX_WIDTH_PORTRAIT = 270;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export interface ProcessedContentImages {
  full: string;
  compressed: string;
}

export interface ImageValidationError {
  valid: false;
  error: string;
}

export interface ImageValidationSuccess {
  valid: true;
}

export type ImageValidationResult = ImageValidationError | ImageValidationSuccess;

export function validateContentImage(file: File): ImageValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 7MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { valid: true };
}

function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number,
  format: 'image/webp' | 'image/jpeg' = 'image/webp'
): Promise<Blob> {
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
      format,
      quality
    );
  });
}

async function loadImage(file: File): Promise<HTMLImageElement> {
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

export async function processAndUploadContentImage(
  file: File,
  isPortrait: boolean = false,
  onProgress?: (stage: string) => void,
): Promise<ProcessedContentImages> {
  const validation = validateContentImage(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    onProgress?.('Loading image...');
    const img = await loadImage(file);

    const fullMaxWidth = isPortrait ? FULL_IMAGE_MAX_WIDTH_PORTRAIT : FULL_IMAGE_MAX_WIDTH_LANDSCAPE;
    const thumbnailMaxWidth = isPortrait ? THUMBNAIL_MAX_WIDTH_PORTRAIT : THUMBNAIL_MAX_WIDTH_LANDSCAPE;

    onProgress?.('Processing full resolution...');
    const fullBlob = await resizeImage(img, fullMaxWidth, 0.85, 'image/webp');

    onProgress?.('Processing compressed thumbnail...');
    const thumbnailBlob = await resizeImage(img, thumbnailMaxWidth, 0.50, 'image/webp');

    const baseFileName = file.name.replace(/\.[^/.]+$/, '');

    onProgress?.('Uploading full image...');
    const fullKey = generateStorageKey('images', baseFileName, 'full', 'webp');
    const fullResult = await uploadBlob(fullBlob, CONTENT_MEDIA_BUCKET, fullKey, 'image/webp');

    onProgress?.('Uploading thumbnail...');
    const posterKey = generateStorageKey('posters', baseFileName, 'poster', 'webp');
    const posterResult = await uploadBlob(thumbnailBlob, CONTENT_MEDIA_BUCKET, posterKey, 'image/webp');

    onProgress?.('Complete!');

    return {
      full: fullResult.publicUrl,
      compressed: posterResult.publicUrl,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process and upload content image');
  }
}

export async function deleteContentImages(
  fullUrl: string | null,
  compressedUrl: string | null
): Promise<void> {
  await Promise.all([
    deleteByUrl(fullUrl),
    deleteByUrl(compressedUrl),
  ]);
}
