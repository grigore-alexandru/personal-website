'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { uploadBlob, getDocumentStorageKey, DOCUMENTS_BUCKET } from '../../lib/storageClient';
import { processAndUploadDocumentThumbnail, validateDocumentFile } from '../../utils/documentThumbnailProcessing';

export interface UploadedDocumentFile {
  fileUrl: string;
  thumbnailUrl: string;
  fileSizeBytes: number;
  pageCount: number;
}

interface DocumentFileUploadProps {
  /** Must be a validated, slug-unique value — the storage key is derived
   *  from it, so upload is disabled until the caller has one. */
  slug: string;
  disabled?: boolean;
  /** Label swap for the "replace an existing file" case. */
  isReplace?: boolean;
  onUploaded: (result: UploadedDocumentFile) => void;
}

/**
 * PDF picker for the admin form. Renders the page-1 thumbnail and uploads
 * both files client-side, straight to Mega S4, via the existing presign flow
 * — the Next.js server only ever authorizes the upload, never touches the
 * bytes (see src/lib/storageClient.ts, src/app/api/storage/presign/route.ts).
 */
export function DocumentFileUpload({ slug, disabled, isReplace, onUploaded }: DocumentFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDisabled = disabled || isUploading;

  const handleFile = async (file: File) => {
    setError(null);

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    if (!slug) {
      setError('Choose a slug before uploading a file.');
      return;
    }

    setIsUploading(true);
    try {
      const { thumbnailUrl, pageCount } = await processAndUploadDocumentThumbnail(file, slug, setProgress);

      setProgress('Uploading PDF…');
      const pdfKey = getDocumentStorageKey(slug, 'pdf');
      const pdfResult = await uploadBlob(file, DOCUMENTS_BUCKET, pdfKey, 'application/pdf');

      setProgress('Complete!');
      setUploadedName(file.name);
      onUploaded({
        fileUrl: pdfResult.publicUrl,
        thumbnailUrl,
        fileSizeBytes: file.size,
        pageCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
      setProgress('');
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDisabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void handleFile(files[0]);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) void handleFile(files[0]);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isDisabled ? () => fileInputRef.current?.click() : undefined}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-black bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInputChange}
          disabled={isDisabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Loader2 size={28} className="text-neutral-500 animate-spin" />
              <p className="text-sm text-neutral-600">{progress}</p>
            </>
          ) : uploadedName ? (
            <>
              <CheckCircle2 size={28} className="text-green-600" />
              <p className="text-sm font-medium text-black">{uploadedName}</p>
              <p className="text-xs text-neutral-500">Click or drop a new file to replace it</p>
            </>
          ) : (
            <>
              <Upload size={28} className="text-neutral-400" />
              <p className="text-sm font-medium text-black">
                {isReplace ? 'Drop a new PDF to replace this file' : 'Drop a PDF here, or click to browse'}
              </p>
              <p className="text-xs text-neutral-500">
                {slug ? 'PDF only' : 'Choose a slug above first'}
              </p>
            </>
          )}
        </div>
      </div>

      {!isUploading && !uploadedName && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          <FileText size={12} />
          The first page is rendered automatically as the document's thumbnail.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
