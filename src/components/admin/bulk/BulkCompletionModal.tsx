import { CheckCircle2, AlertCircle, XCircle, ArrowRight, X } from 'lucide-react';
import { StagingItem } from '../../../types/bulk';

export interface CompletionSummary {
  total: number;
  succeeded: number;
  failed: StagingItem[];
  cancelled: number;
}

interface BulkCompletionModalProps {
  summary: CompletionSummary;
  onGoToContent: () => void;
  onViewFailures: () => void;
  onDismiss: () => void;
}

export function BulkCompletionModal({
  summary,
  onGoToContent,
  onViewFailures,
  onDismiss,
}: BulkCompletionModalProps) {
  const { total, succeeded, failed, cancelled } = summary;
  const hasFailures = failed.length > 0;
  const hasCancelled = cancelled > 0;
  const allGood = !hasFailures && !hasCancelled;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header band */}
        <div
          className={`px-6 pt-6 pb-5 ${
            allGood ? 'bg-emerald-50' : hasFailures ? 'bg-amber-50' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  allGood ? 'bg-emerald-100' : 'bg-amber-100'
                }`}
              >
                {allGood ? (
                  <CheckCircle2 size={22} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={22} className="text-amber-600" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-black">Upload Complete</h2>
                <p className={`text-sm mt-0.5 ${allGood ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {allGood
                    ? `All ${total} item${total !== 1 ? 's' : ''} published successfully`
                    : `${succeeded} of ${total} published`}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors -mt-1 -mr-1 p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b border-gray-100">
          <StatCell
            label="Published"
            value={succeeded}
            color="emerald"
            icon={<CheckCircle2 size={16} />}
          />
          <StatCell
            label="Failed"
            value={failed.length}
            color={hasFailures ? 'red' : 'gray'}
            icon={<XCircle size={16} />}
          />
          <StatCell
            label="Skipped"
            value={cancelled}
            color={hasCancelled ? 'amber' : 'gray'}
            icon={<AlertCircle size={16} />}
          />
        </div>

        {/* Error list */}
        {hasFailures && (
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
              Failed items
            </p>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {failed.map((item) => (
                <li key={item.localId} className="flex items-start gap-2">
                  <XCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title || 'Untitled'}
                    </p>
                    {item.errorMessage && (
                      <p className="text-xs text-red-600 mt-0.5 leading-snug">
                        {item.errorMessage}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasFailures && (
              <button
                onClick={() => { onViewFailures(); onDismiss(); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <AlertCircle size={14} />
                Highlight failures in grid
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDismiss}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Stay here
            </button>
            <button
              onClick={onGoToContent}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
            >
              Go to Content
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCellProps {
  label: string;
  value: number;
  color: 'emerald' | 'red' | 'amber' | 'gray';
  icon: React.ReactNode;
}

function StatCell({ label, value, color, icon }: StatCellProps) {
  const colorMap = {
    emerald: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    amber: 'text-amber-600 bg-amber-50',
    gray: 'text-gray-400 bg-gray-50',
  };

  return (
    <div className={`rounded-xl px-3 py-3 ${colorMap[color]}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${colorMap[color].split(' ')[0]}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${colorMap[color].split(' ')[0]}`}>
        {value}
      </p>
    </div>
  );
}
