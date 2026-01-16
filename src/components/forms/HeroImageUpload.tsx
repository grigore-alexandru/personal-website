import { useState, useRef, DragEvent } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { processAndUploadHeroImage, validateHeroImage } from '../../utils/heroImageProcessing';

interface HeroImageUploadProps {
  onUploadComplete: (largeUrl: string, thumbnailUrl: string) => void;
  onRemove: () => void;
  largeUrl: string | null;
  thumbnailUrl: string | null;
  disabled?: boolean;
}

export function HeroImageUpload({
  onUploadComplete,
  onRemove,
  largeUrl,
  thumbnailUrl,
  disabled = false,
}: HeroImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    const validation = validateHeroImage(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setIsUploading(true);

    try {
      const { largeUrl, thumbnailUrl } = await processAndUploadHeroImage(
        file,
        (stage) => setUploadProgress(stage)
      );

      onUploadComplete(largeUrl, thumbnailUrl);
      URL.revokeObjectURL(preview);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      URL.revokeObjectURL(preview);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemoveClick = () => {
    setError(null);
    onRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const hasImage = largeUrl && thumbnailUrl;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-200">
        Hero Image
        <span className="ml-1 text-xs text-neutral-400">(Required for published posts)</span>
      </label>

      {!hasImage && !previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center
            transition-all duration-200
            ${isDragging
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
            }
            ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={!disabled && !isUploading ? handleBrowseClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileInputChange}
            disabled={disabled || isUploading}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            {isUploading ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                <p className="text-sm text-neutral-300">{uploadProgress}</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-200 font-medium">
                    Drop your hero image here, or click to browse
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    JPEG, PNG, or WebP • Max 5MB • Recommended: 1920x1080px or larger
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-neutral-800 border border-neutral-700">
          <div className="aspect-video w-full">
            <img
              src={previewUrl || thumbnailUrl || ''}
              alt="Hero image preview"
              className="w-full h-full object-cover"
            />
          </div>

          {isUploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-white">{uploadProgress}</p>
              </div>
            </div>
          )}

          {!isUploading && (
            <button
              type="button"
              onClick={handleRemoveClick}
              disabled={disabled}
              className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {hasImage && !isUploading && (
            <div className="p-3 bg-neutral-900/90 border-t border-neutral-700">
              <div className="flex items-start gap-2 text-xs">
                <ImageIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-green-400 font-medium mb-1">Upload complete</p>
                  <div className="space-y-1 text-neutral-400">
                    <p className="truncate" title={largeUrl || ''}>
                      Large: {largeUrl?.split('/').pop()}
                    </p>
                    <p className="truncate" title={thumbnailUrl || ''}>
                      Thumb: {thumbnailUrl?.split('/').pop()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
