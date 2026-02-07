import { supabase } from '../lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const LARGE_IMAGE_MAX_WIDTH = 1920;
const THUMBNAIL_MAX_WIDTH = 800;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

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
  quality: number
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
      'image/jpeg',
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

async function uploadToStorage(
  blob: Blob,
  fileName: string
): Promise<string> {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const fileExtension = 'jpg';
  const storagePath = `hero-images/${timestamp}-${randomString}-${fileName}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from('blog-images')
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('blog-images')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function processAndUploadHeroImage(
  file: File,
  onProgress?: (stage: string) => void
): Promise<ProcessedImages> {
  const validation = validateHeroImage(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    onProgress?.('Loading image...');
    const img = await loadImage(file);

    onProgress?.('Processing large version...');
    const largeBlob = await resizeImage(img, LARGE_IMAGE_MAX_WIDTH, 0.85);

    onProgress?.('Processing thumbnail...');
    const thumbnailBlob = await resizeImage(img, THUMBNAIL_MAX_WIDTH, 0.75);

    const baseFileName = file.name.replace(/\.[^/.]+$/, '');

    onProgress?.('Uploading large image...');
    const largeUrl = await uploadToStorage(largeBlob, `${baseFileName}-large`);

    onProgress?.('Uploading thumbnail...');
    const thumbnailUrl = await uploadToStorage(thumbnailBlob, `${baseFileName}-thumb`);

    onProgress?.('Complete!');

    return {
      largeUrl,
      thumbnailUrl,
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
  bucketName: string = 'blog-images'
): Promise<void> {
  const filesToDelete: string[] = [];

  if (largeUrl) {
    const largePath = largeUrl.split(`/${bucketName}/`)[1];
    if (largePath) {
      filesToDelete.push(largePath);
    }
  }

  if (thumbnailUrl) {
    const thumbPath = thumbnailUrl.split(`/${bucketName}/`)[1];
    if (thumbPath) {
      filesToDelete.push(thumbPath);
    }
  }

  if (filesToDelete.length > 0) {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove(filesToDelete);

    if (error) {
      console.error('Failed to delete hero images:', error);
    }
  }
}
