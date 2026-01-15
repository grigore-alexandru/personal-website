import { supabase } from '../lib/supabase';

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

export async function uploadImageToSupabase(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    onProgress?.({ progress: 0, status: 'uploading' });

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    onProgress?.({ progress: 50, status: 'uploading' });

    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;

    onProgress?.({ progress: 100, status: 'success', url: publicUrl });

    return publicUrl;
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
