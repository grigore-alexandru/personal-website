import { supabase } from '../lib/supabase';

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

async function uploadToContentMedia(
  blob: Blob,
  fileName: string,
  subfolder: string,
  bucket: string = 'portfolio-images',
  contentType: string = 'image/webp'
): Promise<string> {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const fileExtension = contentType === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `${subfolder}/${timestamp}-${randomString}-${fileName}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function processAndUploadContentImage(
  file: File,
  isPortrait: boolean = false,
  onProgress?: (stage: string) => void,
  bucket: string = 'portfolio-images'
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
    const fullUrl = await uploadToContentMedia(fullBlob, `${baseFileName}-full`, 'gallery/full', bucket, 'image/webp');

    onProgress?.('Uploading thumbnail...');
    const compressedUrl = await uploadToContentMedia(
      thumbnailBlob,
      `${baseFileName}-thumb`,
      'gallery/thumbnails',
      bucket,
      'image/webp'
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
  const extractBucketAndPath = (url: string): { bucket: string; path: string } | null => {
    const buckets = ['portfolio-images', 'blog-images', 'content-media'];
    for (const bucket of buckets) {
      const parts = url.split(`/${bucket}/`);
      if (parts.length === 2) {
        return { bucket, path: parts[1] };
      }
    }
    return null;
  };

  if (fullUrl) {
    const result = extractBucketAndPath(fullUrl);
    if (result) {
      const { error } = await supabase.storage
        .from(result.bucket)
        .remove([result.path]);
      if (error) {
        console.error('Failed to delete full image:', error);
      }
    }
  }

  if (compressedUrl) {
    const result = extractBucketAndPath(compressedUrl);
    if (result) {
      const { error } = await supabase.storage
        .from(result.bucket)
        .remove([result.path]);
      if (error) {
        console.error('Failed to delete thumbnail:', error);
      }
    }
  }
}
