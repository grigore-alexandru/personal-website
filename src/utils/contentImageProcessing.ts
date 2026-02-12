import { supabase } from '../lib/supabase';

const MAX_FILE_SIZE = 7 * 1024 * 1024;
const FULL_IMAGE_MAX_WIDTH = 1920;
const THUMBNAIL_MAX_WIDTH = 400;
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

async function uploadToContentMedia(
  blob: Blob,
  fileName: string,
  subfolder: string
): Promise<string> {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const fileExtension = 'jpg';
  const storagePath = `${subfolder}/${timestamp}-${randomString}-${fileName}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from('content-media')
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('content-media')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function processAndUploadContentImage(
  file: File,
  onProgress?: (stage: string) => void
): Promise<ProcessedContentImages> {
  const validation = validateContentImage(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    onProgress?.('Loading image...');
    const img = await loadImage(file);

    onProgress?.('Processing full resolution...');
    const fullBlob = await resizeImage(img, FULL_IMAGE_MAX_WIDTH, 0.85);

    onProgress?.('Processing compressed thumbnail...');
    const thumbnailBlob = await resizeImage(img, THUMBNAIL_MAX_WIDTH, 0.55);

    const baseFileName = file.name.replace(/\.[^/.]+$/, '');

    onProgress?.('Uploading full image...');
    const fullUrl = await uploadToContentMedia(fullBlob, `${baseFileName}-full`, 'images/full');

    onProgress?.('Uploading thumbnail...');
    const compressedUrl = await uploadToContentMedia(
      thumbnailBlob,
      `${baseFileName}-thumb`,
      'images/thumb'
    );

    onProgress?.('Complete!');

    return {
      full: fullUrl,
      compressed: compressedUrl,
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
  const filesToDelete: string[] = [];

  if (fullUrl) {
    const fullPath = fullUrl.split('/content-media/')[1];
    if (fullPath) {
      filesToDelete.push(fullPath);
    }
  }

  if (compressedUrl) {
    const thumbPath = compressedUrl.split('/content-media/')[1];
    if (thumbPath) {
      filesToDelete.push(thumbPath);
    }
  }

  if (filesToDelete.length > 0) {
    const { error } = await supabase.storage
      .from('content-media')
      .remove(filesToDelete);

    if (error) {
      console.error('Failed to delete content images:', error);
    }
  }
}
