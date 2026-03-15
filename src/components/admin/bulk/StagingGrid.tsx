import { useRef, useState, DragEvent, useCallback } from 'react';
import { X, CheckCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { StagingItem, BulkSelection } from '../../../types/bulk';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../ui/Toast';
import { deduceMetadataFromFiles } from '../../../utils/bulkDeduction';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface StagingGridProps {
  items: StagingItem[];
  selection: BulkSelection;
  onItemClick: (localId: string, e: React.MouseEvent) => void;
  onRemove: (localId: string) => void;
  onAppend?: (newItems: StagingItem[]) => void;
}

export function StagingGrid({
  items,
  selection,
  onItemClick,
  onRemove,
  onAppend,
}: StagingGridProps) {
  const { toasts, showToast, closeToast } = useToast();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDraggingOver(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDraggingOver(false);

      if (!onAppend) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((f) => ALLOWED_IMAGE_MIME.includes(f.type));
      const rejected = files.length - imageFiles.length;

      if (rejected > 0) {
        showToast(
          'error',
          `${rejected} file${rejected > 1 ? 's' : ''} rejected — only images (JPEG, PNG, WebP) accepted`
        );
      }

      if (imageFiles.length === 0) return;

      setIsProcessing(true);
      try {
        const newItems = await deduceMetadataFromFiles(imageFiles);
        onAppend(newItems);
      } catch {
        showToast('error', 'Failed to process dropped files');
      } finally {
        setIsProcessing(false);
      }
    },
    [onAppend, showToast]
  );

  return (
    <>
      <div
        className={`
          w-[340px] flex-shrink-0 border-r border-gray-200 overflow-y-auto relative
          transition-colors duration-150
          ${isDraggingOver ? 'bg-blue-50' : 'bg-neutral-50'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drop overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-blue-400 rounded-lg m-2 bg-blue-50/80 pointer-events-none">
            <CheckCircle2 size={28} className="text-blue-500" />
            <p className="text-sm font-medium text-blue-700">Drop to add images</p>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 pointer-events-none">
            <Loader2 size={24} className="animate-spin text-gray-500" />
            <p className="text-sm text-gray-600">Processing…</p>
          </div>
        )}

        <div className="p-3 grid grid-cols-3 gap-2">
          {items.map((item, index) => (
            <GridCard
              key={item.localId}
              item={item}
              index={index}
              isActive={selection.activeId === item.localId}
              isSelected={selection.selectedIds.has(item.localId)}
              onItemClick={onItemClick}
              onRemove={onRemove}
            />
          ))}
        </div>

        {items.length === 0 && !isDraggingOver && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400">No items staged</p>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </>
  );
}

interface GridCardProps {
  item: StagingItem;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  onItemClick: (localId: string, e: React.MouseEvent) => void;
  onRemove: (localId: string) => void;
}

function GridCard({ item, isActive, isSelected, onItemClick, onRemove }: GridCardProps) {
  const isUploading = item.status === 'uploading';
  const isSuccess = item.status === 'success';
  const isError = item.status === 'error';
  const isPending = item.status === 'pending';
  const isQueued = isPending && !isActive;

  const ringClass = isActive
    ? 'ring-4 ring-black ring-offset-1'
    : isSelected
    ? 'ring-2 ring-blue-500 ring-offset-1'
    : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1';

  return (
    <div
      onClick={(e) => onItemClick(item.localId, e)}
      className={`
        relative rounded-lg overflow-hidden cursor-pointer select-none aspect-square group
        transition-shadow
        ${ringClass}
      `}
    >
      <img
        src={item.previewUrl}
        alt={item.title}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Queued items — subtle dimming so focus is clear */}
      {isQueued && !isSelected && !isActive && (
        <div className="absolute inset-0 bg-black/10" />
      )}

      {/* Uploading overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-white" />
        </div>
      )}

      {/* Success overlay */}
      {isSuccess && (
        <div className="absolute inset-0 bg-emerald-500/25 flex items-end justify-end p-1.5">
          <CheckCircle2 size={16} className="text-emerald-600 drop-shadow" />
        </div>
      )}

      {/* Error overlay */}
      {isError && (
        <div className="absolute inset-0 bg-red-500/25 flex items-end justify-end p-1.5">
          <AlertCircle size={16} className="text-red-600 drop-shadow" />
        </div>
      )}

      {/* isModified badge — top-left green checkmark */}
      {item.isModified && !isUploading && !isSuccess && (
        <div className="absolute top-1 left-1">
          <CheckCircle size={14} className="text-emerald-500 drop-shadow" />
        </div>
      )}

      {/* Multi-select dot */}
      {isSelected && !isActive && (
        <div className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow" />
      )}

      {/* Remove button — visible on hover, hidden while uploading or succeeded */}
      {!isUploading && !isSuccess && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            URL.revokeObjectURL(item.previewUrl);
            onRemove(item.localId);
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
          title="Remove"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}
