import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { StagingItem } from '../../../types/bulk';
import { runBulkUploadLoop } from '../../../utils/bulkUploadLoop';
import { ToastType } from '../../ui/Toast';
import { BulkCompletionModal, CompletionSummary } from './BulkCompletionModal';

interface BulkProgressFooterProps {
  items: StagingItem[];
  onItemUpdate: (localId: string, patch: Partial<StagingItem>) => void;
  onDone: () => void;
  onViewFailures: () => void;
  onGoToContent: () => void;
  showToast: (type: ToastType, message: string) => void;
}

export function BulkProgressFooter({
  items,
  onItemUpdate,
  onDone,
  onViewFailures,
  onGoToContent,
  showToast,
}: BulkProgressFooterProps) {
  const [currentLabel, setCurrentLabel] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const isRunning = useRef(false);
  const cancelRef = useRef(false);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (isRunning.current) return;
    isRunning.current = true;
    cancelRef.current = false;

    runBulkUploadLoop(items, {
      onItemUpdate,
      onProgress: setCurrentLabel,
      onDone: () => {
        isRunning.current = false;
        const current = itemsRef.current;
        const succeeded = current.filter((i) => i.status === 'success').length;
        const failed = current.filter((i) => i.status === 'error');
        const cancelled = current.filter((i) => i.status === 'pending').length;
        setSummary({ total: current.length, succeeded, failed, cancelled });
        onDone();
      },
      cancelRef,
    });

    return () => {
      cancelRef.current = true;
    };
  }, []);

  const doneCount = items.filter((i) => i.status === 'success').length;
  const errorItems = items.filter((i) => i.status === 'error');
  const errorCount = errorItems.length;
  const total = items.length;
  const progressCount = doneCount + errorCount;
  const percent = total > 0 ? Math.round((progressCount / total) * 100) : 0;
  const isComplete = progressCount === total;
  const isCancelling = cancelRef.current && !isComplete;

  const handleCancel = () => {
    cancelRef.current = true;
    showToast('error', 'Upload cancelled — remaining items skipped');
  };

  if (isDismissed) return null;

  return (
    <>
      <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">

        {/* Error detail panel */}
        {showErrors && errorCount > 0 && (
          <div className="border-b border-gray-100 px-6 py-3 max-h-44 overflow-y-auto bg-red-50">
            <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">
              Failed items ({errorCount})
            </p>
            <ul className="space-y-1.5">
              {errorItems.map((item) => (
                <li key={item.localId} className="flex items-start gap-2">
                  <XCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-red-800">
                    <strong className="font-medium">{item.title || 'Untitled'}</strong>
                    {item.errorMessage ? ` — ${item.errorMessage}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main bar */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {isComplete ? (
                    <span className={`flex items-center gap-1.5 ${errorCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      <CheckCircle2 size={15} />
                      Upload complete —&nbsp;
                      <strong>{doneCount} published</strong>
                      {errorCount > 0 && (
                        <span className="text-red-600">, {errorCount} failed</span>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-gray-600">
                      <Loader2 size={14} className="animate-spin flex-shrink-0" />
                      <span className="truncate">{currentLabel || 'Preparing…'}</span>
                    </span>
                  )}
                </span>

                <span className="text-xs text-gray-400 font-medium flex-shrink-0 ml-3 tabular-nums">
                  {progressCount} / {total}
                  <span className="ml-1.5 text-gray-300">({percent}%)</span>
                </span>
              </div>

              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isComplete && errorCount === 0
                      ? 'bg-emerald-500'
                      : isComplete && errorCount > 0
                      ? 'bg-amber-400'
                      : 'bg-black'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!isComplete && (
                <button
                  onClick={handleCancel}
                  disabled={cancelRef.current}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XCircle size={14} />
                  Cancel remaining
                </button>
              )}

              {isComplete && errorCount > 0 && (
                <button
                  onClick={() => setShowErrors((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <AlertCircle size={14} />
                  {showErrors ? 'Hide' : 'View'} errors
                  {showErrors ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                </button>
              )}

              {isComplete && (
                <button
                  onClick={() => {
                    const current = itemsRef.current;
                    setSummary({
                      total: current.length,
                      succeeded: current.filter((i) => i.status === 'success').length,
                      failed: current.filter((i) => i.status === 'error'),
                      cancelled: current.filter((i) => i.status === 'pending').length,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CheckCircle2 size={14} />
                  Summary
                </button>
              )}

              {isComplete && (
                <button
                  onClick={() => setIsDismissed(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Dismiss"
                >
                  <X size={14} />
                  Dismiss
                </button>
              )}
            </div>
          </div>

          {isCancelling && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} />
              Cancelling — waiting for current item to finish…
            </p>
          )}
        </div>
      </div>

      {summary && (
        <BulkCompletionModal
          summary={summary}
          onGoToContent={onGoToContent}
          onViewFailures={onViewFailures}
          onDismiss={() => setSummary(null)}
        />
      )}
    </>
  );
}
