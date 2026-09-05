'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { uploadBlob, deleteByUrl, getDocumentStorageKey, DOCUMENTS_BUCKET } from '../../lib/storageClient';
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
  /** Called after a just-uploaded (not yet saved) file is removed via the X
   *  button, so the parent can clear whatever it was holding from
   *  onUploaded. Optional — the `isReplace` case (DocumentCard) doesn't need
   *  it, since removing there just clears this picker's own local state and
   *  the document's still-live current file is untouched either way. */
  onRemoved?: () => void;
}

/**
 * PDF picker for the admin form. Renders the page-1 thumbnail and uploads
 * both files client-side, straight to Mega S4, via the existing presign flow
 * — the Next.js server only ever authorizes the upload, never touches the
 * bytes (see src/lib/storageClient.ts, src/app/api/storage/presign/route.ts).
 */
export function DocumentFileUpload({ slug, disabled, isReplace, onUploaded, onRemoved }: DocumentFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<(UploadedDocumentFile & { fileName: string }) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDisabled = disabled || isUploading || isRemoving;

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
      const result: UploadedDocumentFile = {
        fileUrl: pdfResult.publicUrl,
        thumbnailUrl,
        fileSizeBytes: file.size,
        pageCount,
      };
      setUploaded({ ...result, fileName: file.name });
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
      setProgress('');
    }
  };

  // The picked file is already live in the `documents` bucket at this point
  // (uploadBlob/processAndUploadDocumentThumbnail both PUT directly, before
  // the parent form has saved anything to the DB) — removing it here without
  // also deleting those two objects would orphan them in storage forever,
  // since nothing else ever points at that slug's key until a document row
  // is actually created.
  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!uploaded) return;

    setIsRemoving(true);
    setError(null);
    try {
      await Promise.all([deleteByUrl(uploaded.fileUrl), deleteByUrl(uploaded.thumbnailUrl)]);
    } catch (err) {
      // Not fatal to the form — surface it, but still clear the picker so
      // the user can try a different file rather than getting stuck.
      console.error('Failed to remove uploaded document from storage:', err);
    } finally {
      setUploaded(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsRemoving(false);
      onRemoved?.();
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
        onClick={!isDisabled && !uploaded ? () => fileInputRef.current?.click() : undefined}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-black bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : uploaded ? '' : 'cursor-pointer'}`}
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
          ) : uploaded ? (
            <>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isRemoving}
                aria-label="Remove uploaded file"
                title="Remove file"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:text-red-600 hover:border-red-200 shadow-sm transition-colors disabled:opacity-50"
              >
                {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              </button>
              <div className="w-20 h-24 rounded-md overflow-hidden bg-white border border-neutral-200 shadow-sm">
                <Image
                  src={uploaded.thumbnailUrl}
                  alt=""
                  width={80}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm font-medium text-black truncate max-w-full">{uploaded.fileName}</p>
              <p className="text-xs text-neutral-500">
                {uploaded.pageCount} page{uploaded.pageCount === 1 ? '' : 's'} · Click the ✕ to remove
              </p>
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

      {!isUploading && !uploaded && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          <FileText size={12} />
          The first page is rendered automatically as the document's thumbnail.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
