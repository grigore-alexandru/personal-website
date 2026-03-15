import { useState, useRef, DragEvent } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

interface BulkDropZoneProps {
  onFiles: (files: File[]) => void;
  isProcessing: boolean;
}

export function BulkDropZone({ onFiles, isProcessing }: BulkDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isProcessing && inputRef.current?.click()}
      className={`
        relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer
        flex flex-col items-center justify-center p-16 gap-4 select-none
        ${isDragging ? 'border-black bg-gray-50 scale-[1.01]' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}
        ${isProcessing ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      {isProcessing ? (
        <>
          <Loader2 size={40} className="animate-spin text-gray-400" />
          <p className="text-sm font-medium text-gray-600">Analysing files…</p>
        </>
      ) : (
        <>
          <div
            className={`flex items-center justify-center w-16 h-16 rounded-full transition-colors ${
              isDragging ? 'bg-black' : 'bg-gray-100'
            }`}
          >
            <UploadCloud size={28} className={isDragging ? 'text-white' : 'text-gray-500'} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-800">
              {isDragging ? 'Drop to stage' : 'Drop images here or click to browse'}
            </p>
            <p className="text-sm text-gray-400 mt-1">JPEG, PNG, WebP — up to 100 files per batch</p>
          </div>
        </>
      )}
    </div>
  );
}
