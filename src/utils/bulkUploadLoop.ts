import { MutableRefObject } from 'react';
import { supabase } from '../lib/supabase';
import { StagingItem } from '../types/bulk';
import { uploadContentMainImage } from './imageUpload';
import { processAndUploadContentPoster } from './contentImageProcessing';
import { createContent, addContentToProject, checkContentSlugUniqueness } from './contentService';

export interface UploadLoopCallbacks {
  onItemUpdate: (localId: string, patch: Partial<StagingItem>) => void;
  onProgress: (label: string) => void;
  onDone: () => void;
  cancelRef: MutableRefObject<boolean>;
}

async function resolveImageTypeId(): Promise<string> {
  const { data, error } = await supabase
    .from('content_types')
    .select('id')
    .eq('slug', 'image')
    .maybeSingle();

  if (error || !data) throw new Error('Could not resolve "image" content type');
  return data.id;
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const isUnique = await checkContentSlugUniqueness(baseSlug);
  if (isUnique) return baseSlug;

  const suffix = Date.now().toString(36).slice(-4);
  let candidate = `${baseSlug}-${suffix}`;
  let attempt = 2;

  while (!(await checkContentSlugUniqueness(candidate))) {
    candidate = `${baseSlug}-${attempt}`;
    attempt++;
    if (attempt > 20) {
      candidate = `${baseSlug}-${Date.now().toString(36)}`;
      break;
    }
  }

  return candidate;
}

export async function runBulkUploadLoop(
  items: StagingItem[],
  callbacks: UploadLoopCallbacks
): Promise<void> {
  const { onItemUpdate, onProgress, onDone, cancelRef } = callbacks;

  let imageTypeId: string;
  try {
    imageTypeId = await resolveImageTypeId();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to resolve content type';
    items.forEach((item) => onItemUpdate(item.localId, { status: 'error', errorMessage: msg }));
    onDone();
    return;
  }

  const pending = items.filter((i) => i.status === 'pending');

  for (const item of pending) {
    if (cancelRef.current) break;

    onItemUpdate(item.localId, { status: 'uploading', errorMessage: null });

    try {
      onProgress(`"${item.title}" — uploading main image…`);
      const mainResult = await uploadContentMainImage(item.file);

      if (cancelRef.current) {
        onItemUpdate(item.localId, { status: 'pending', errorMessage: null });
        break;
      }

      onProgress(`"${item.title}" — generating thumbnail…`);
      const thumbResult = await processAndUploadContentPoster(item.file, item.format === 'portrait');

      onProgress(`"${item.title}" — saving record…`);
      const slug = await ensureUniqueSlug(item.slug);

      const contentResult = await createContent({
        type_id: imageTypeId,
        title: item.title,
        slug,
        caption: item.caption || null,
        url: mainResult.publicUrl,
        platform: null,
        format: item.format,
        thumbnail: { poster: thumbResult.poster },
        is_draft: false,
        published_at: item.publishedDate || null,
      });

      if (!contentResult.success || !contentResult.data) {
        throw new Error(contentResult.error || 'Failed to create content record');
      }

      if (item.projectId && contentResult.data.id) {
        await addContentToProject(item.projectId, contentResult.data.id, 0);
      }

      onItemUpdate(item.localId, { status: 'success', errorMessage: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      onItemUpdate(item.localId, { status: 'error', errorMessage: msg });
    } finally {
      URL.revokeObjectURL(item.previewUrl);
    }

    await new Promise<void>((r) => setTimeout(r, 0));
  }

  onProgress('');
  onDone();
}
