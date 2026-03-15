import { slugify } from './slugify';
import { titleFromFileName } from './titleFromFileName';
import { loadImageDimensions } from './loadImageDimensions';
import { StagingItem } from '../types/bulk';

export async function deduceMetadataFromFiles(files: File[]): Promise<StagingItem[]> {
  const today = new Date().toISOString().split('T')[0];

  const items = await Promise.all(
    files.map(async (file): Promise<StagingItem> => {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      const title = titleFromFileName(file.name);
      const slug = slugify(title);

      let format: 'landscape' | 'portrait' = 'landscape';
      try {
        const { width, height } = await loadImageDimensions(file);
        format = height > width ? 'portrait' : 'landscape';
      } catch {
        // fallback to landscape on failure
      }

      return {
        localId,
        file,
        previewUrl,
        title,
        slug,
        caption: '',
        format,
        projectId: null,
        publishedDate: today,
        status: 'pending',
        errorMessage: null,
        isModified: false,
      };
    })
  );

  return items;
}
