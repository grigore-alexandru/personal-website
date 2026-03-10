import { uploadBlob, deleteByUrl, generateStorageKey } from '../lib/storageClient';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export const PORTFOLIO_IMAGES_BUCKET = 'portfolio-images';
export const BLOG_IMAGES_BUCKET = 'blog-images';

interface CompressionProfile {
  largeMaxWidth: number;
  largeQuality: number;
  thumbMaxWidth: number;
  thumbQuality: number;
  largeFolder: string;
  thumbFolder: string;
}

const PORTFOLIO_PROFILE: CompressionProfile = {
  largeMaxWidth: 1920,
  largeQuality: 0.85,
  thumbMaxWidth: 800,
  thumbQuality: 0.65,
  largeFolder: 'large',
  thumbFolder: 'thumb',
};

const BLOG_PROFILE: CompressionProfile = {
  largeMaxWidth: 1200,
  largeQuality: 0.80,
  thumbMaxWidth: 600,
  thumbQuality: 0.60,
  largeFolder: 'hero/large',
  thumbFolder: 'hero/thumb',
};

export interface ProcessedImages {
  largeUrl: string;
  thumbnailUrl: string;
}

export interface ImageValidationError {
  valid: false;
  error: string;
}

export interface ImageValidationSuccess {
  valid: true;
}

export type ImageValidationResult = ImageValidationError | ImageValidationSuccess;

export function validateHeroImage(file: File): ImageValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
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

export async function processAndUploadHeroImage(
  file: File,
  onProgress?: (stage: string) => void,
  bucket: string = BLOG_IMAGES_BUCKET
): Promise<ProcessedImages> {
  const validation = validateHeroImage(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const profile = bucket === PORTFOLIO_IMAGES_BUCKET ? PORTFOLIO_PROFILE : BLOG_PROFILE;

  try {
    onProgress?.('Loading image...');
    const img = await loadImage(file);

    onProgress?.('Processing large version...');
    const largeBlob = await resizeImage(img, profile.largeMaxWidth, profile.largeQuality, 'image/webp');

    onProgress?.('Processing thumbnail...');
    const thumbnailBlob = await resizeImage(img, profile.thumbMaxWidth, profile.thumbQuality, 'image/webp');

    const baseFileName = file.name.replace(/\.[^/.]+$/, '');

    onProgress?.('Uploading large image...');
    const largeKey = generateStorageKey(profile.largeFolder, baseFileName, 'large', 'webp');
    const largeResult = await uploadBlob(largeBlob, bucket, largeKey, 'image/webp');

    onProgress?.('Uploading thumbnail...');
    const thumbKey = generateStorageKey(profile.thumbFolder, baseFileName, 'thumb', 'webp');
    const thumbResult = await uploadBlob(thumbnailBlob, bucket, thumbKey, 'image/webp');

    onProgress?.('Complete!');

    return {
      largeUrl: largeResult.publicUrl,
      thumbnailUrl: thumbResult.publicUrl,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process and upload hero image');
  }
}

export async function deleteHeroImages(
  largeUrl: string | null,
  thumbnailUrl: string | null,
): Promise<void> {
  await Promise.all([
    deleteByUrl(largeUrl),
    deleteByUrl(thumbnailUrl),
  ]);
}
