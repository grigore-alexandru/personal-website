import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { StagingItem, BulkSelection } from '../../../types/bulk';

interface StagingGridProps {
  items: StagingItem[];
  selection: BulkSelection;
  onItemClick: (localId: string, e: React.MouseEvent) => void;
  onRemove: (localId: string) => void;
}

export function StagingGrid({ items, selection, onItemClick, onRemove }: StagingGridProps) {
  return (
    <div className="w-[340px] flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-neutral-50">
      <div className="p-3 grid grid-cols-3 gap-2">
        {items.map((item) => {
          const isActive = selection.activeId === item.localId;
          const isSelected = selection.selectedIds.has(item.localId);

          return (
            <div
              key={item.localId}
              onClick={(e) => onItemClick(item.localId, e)}
              className={`
                relative rounded-lg overflow-hidden cursor-pointer select-none
                aspect-square group transition-all
                ${isActive ? 'ring-2 ring-black ring-offset-1' : ''}
                ${isSelected && !isActive ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                ${!isSelected && !isActive ? 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1' : ''}
              `}
            >
              <img
                src={item.previewUrl}
                alt={item.title}
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Status overlay */}
              {item.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-white" />
                </div>
              )}
              {item.status === 'success' && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-end justify-end p-1">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              )}
              {item.status === 'error' && (
                <div className="absolute inset-0 bg-red-500/20 flex items-end justify-end p-1">
                  <AlertCircle size={16} className="text-red-500" />
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
              )}

              {/* Remove button — visible on hover unless uploading */}
              {item.status !== 'uploading' && item.status !== 'success' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.localId);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
