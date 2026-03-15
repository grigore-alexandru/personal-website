import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { StagingItem } from '../../../types/bulk';
import { runBulkUploadLoop } from '../../../utils/bulkUploadLoop';
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
}: BulkProgressFooterProps) {
  const [currentLabel, setCurrentLabel] = useState('');
  const isRunning = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (isRunning.current) return;
    isRunning.current = true;
    cancelRef.current = false;

    runBulkUploadLoop(items, {
      onItemUpdate,
      onProgress: setCurrentLabel,
      onDone: () => {
        isRunning.current = false;
        onDone();
      },
      cancelRef,
    });

    return () => {
      cancelRef.current = true;
    };
  }, []);

  const doneCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const total = items.length;
  const progressCount = doneCount + errorCount;
  const percent = total > 0 ? Math.round((progressCount / total) * 100) : 0;
  const isComplete = progressCount === total;

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-600 truncate">
              {isComplete ? (
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <CheckCircle2 size={14} />
                  Upload complete — {doneCount} published
                  {errorCount > 0 ? `, ${errorCount} failed` : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin text-gray-500" />
                  {currentLabel || 'Preparing…'}
                </span>
              )}
            </span>
            <span className="text-xs font-medium text-gray-500 flex-shrink-0 ml-3">
              {progressCount} / {total}
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
