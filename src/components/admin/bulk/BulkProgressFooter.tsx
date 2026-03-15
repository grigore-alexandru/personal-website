import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { StagingItem } from '../../../types/bulk';
import { supabase } from '../../../lib/supabase';
import { uploadContentMainImage } from '../../../utils/imageUpload';
import { processAndUploadContentPoster } from '../../../utils/contentImageProcessing';
import { createContent, addContentToProject } from '../../../utils/contentService';
import { ToastType } from '../../ui/Toast';

interface BulkProgressFooterProps {
  items: StagingItem[];
  onItemUpdate: (localId: string, patch: Partial<StagingItem>) => void;
  onDone: () => void;
  showToast: (type: ToastType, message: string) => void;
}

export function BulkProgressFooter({
  items,
  onItemUpdate,
  onDone,
  showToast,
}: BulkProgressFooterProps) {
  const [currentLabel, setCurrentLabel] = useState('');
  const [imageTypeId, setImageTypeId] = useState<string | null>(null);
  const isRunning = useRef(false);

  useEffect(() => {
    resolveImageTypeId().then((id) => setImageTypeId(id));
  }, []);

  useEffect(() => {
    if (!imageTypeId || isRunning.current) return;
    runUploadLoop(imageTypeId);
  }, [imageTypeId]);

  const resolveImageTypeId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from('content_types')
      .select('id, slug')
      .eq('slug', 'image')
      .maybeSingle();
    return data?.id ?? null;
  };

  const runUploadLoop = async (typeId: string) => {
    isRunning.current = true;
    const pending = items.filter((i) => i.status === 'pending');

    for (const item of pending) {
      onItemUpdate(item.localId, { status: 'uploading', errorMessage: null });
      try {
        setCurrentLabel(`Processing "${item.title}" — main image…`);
        const mainResult = await uploadContentMainImage(item.file);

        setCurrentLabel(`Processing "${item.title}" — thumbnail…`);
        const thumbResult = await processAndUploadContentPoster(
          item.file,
          item.format === 'portrait'
        );

        const result = await createContent({
          type_id: typeId,
          title: item.title,
          slug: item.slug,
          caption: item.caption || null,
          url: mainResult.publicUrl,
          platform: null,
          format: item.format,
          thumbnail: { poster: thumbResult.poster },
          is_draft: false,
          published_at: item.publishedDate || null,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to create content record');
        }

        if (item.projectId && result.data.id) {
          await addContentToProject(item.projectId, result.data.id, 0);
        }

        onItemUpdate(item.localId, { status: 'success', errorMessage: null });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        onItemUpdate(item.localId, { status: 'error', errorMessage: msg });
      }
    }

    isRunning.current = false;
    setCurrentLabel('');
    onDone();
  };

  const doneCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const total = items.length;
  const percent = Math.round(((doneCount + errorCount) / total) * 100);
  const isComplete = doneCount + errorCount === total;

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-600 truncate">
              {isComplete ? (
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <CheckCircle2 size={14} />
                  Upload complete — {doneCount} published{errorCount > 0 ? `, ${errorCount} failed` : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin text-gray-500" />
                  {currentLabel || 'Preparing…'}
                </span>
              )}
            </span>
            <span className="text-xs font-medium text-gray-500 flex-shrink-0 ml-3">
              {doneCount + errorCount} / {total}
            </span>
          </div>

          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete && errorCount === 0 ? 'bg-emerald-500' : 'bg-black'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {errorCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-red-600 flex-shrink-0">
            <AlertCircle size={14} />
            {errorCount} failed
          </div>
        )}
      </div>
    </div>
  );
}
