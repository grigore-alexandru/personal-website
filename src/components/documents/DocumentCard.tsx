'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, ExternalLink, FileText, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { KebabMenu } from '../ui/KebabMenu';
import { Modal } from '../ui/Modal';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { FormInput } from '../forms/FormInput';
import { FormTextarea } from '../forms/FormTextarea';
import { Button } from '../forms/Button';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { DocumentFileUpload, type UploadedDocumentFile } from './DocumentFileUpload';
import { PdfViewerLoader } from './PdfViewerLoader';
import { withCacheBust } from '../../utils/documentsService';
import type { Document, DocumentPatch } from '../../types/documents';

interface DocumentCardProps {
  document: Document;
  onPatch: (id: string, patch: DocumentPatch) => Promise<void>;
  onDelete: () => void;
  onToast: (type: 'success' | 'error', message: string) => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function DocumentCard({ document, onPatch, onDelete, onToast }: DocumentCardProps) {
  const [editing, setEditing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description ?? '');
  const [tagsInput, setTagsInput] = useState((document.tags ?? []).join(', '));

  // The preview lightbox below is hand-rolled (not the shared Modal — see
  // its own comment), so it needs this explicitly: Escape closes it and the
  // page behind stops scrolling, same as every other overlay in the admin.
  useModalBehavior(previewing, () => setPreviewing(false));

  const openEdit = () => {
    setTitle(document.title);
    setDescription(document.description ?? '');
    setTagsInput((document.tags ?? []).join(', '));
    setEditing(true);
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      await onPatch(document.id, {
        title: title.trim(),
        description: description.trim() || null,
        tags: tags.length > 0 ? tags : null,
      });
      onToast('success', 'Document updated');
      setEditing(false);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Could not update this document');
    } finally {
      setSaving(false);
    }
  };

  const handleReplaced = async (uploaded: UploadedDocumentFile) => {
    try {
      await onPatch(document.id, {
        fileUrl: uploaded.fileUrl,
        thumbnailUrl: uploaded.thumbnailUrl,
        fileSizeBytes: uploaded.fileSizeBytes,
        pageCount: uploaded.pageCount,
      });
      onToast('success', 'File replaced');
      setReplacing(false);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Could not save the replaced file');
    }
  };

  const handleToggleActive = async () => {
    setTogglingActive(true);
    try {
      await onPatch(document.id, { isActive: !document.isActive });
      onToast('success', document.isActive ? 'Document unpublished' : 'Document published');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Could not change this document’s status');
    } finally {
      setTogglingActive(false);
    }
  };

  return (
    <article
      className={`relative bg-white border rounded-lg hover:shadow-lg transition-all duration-300 ${
        document.isActive ? 'border-gray-100 hover:border-gray-200' : 'border-gray-100 opacity-60'
      }`}
    >
      <div className="p-5 flex items-start gap-4">
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className="w-16 h-20 flex-shrink-0 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label={`Preview ${document.title}`}
          title="Preview"
        >
          {document.thumbnailUrl ? (
            <Image
              src={document.thumbnailUrl}
              alt=""
              width={64}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <FileText size={20} className="text-neutral-300" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-lg font-bold text-black truncate">{document.title}</h2>
            {!document.isActive && (
              <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                INACTIVE
              </span>
            )}
          </div>
          <a
            href={`/documents/${document.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-black transition-colors font-mono"
          >
            /documents/{document.slug}
            <ExternalLink size={12} />
          </a>
          {document.description && (
            <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{document.description}</p>
          )}
          <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1.5">
            <span className="uppercase font-semibold text-neutral-500">{document.fileType}</span>
            <span>•</span>
            <span>{document.pageCount ? `${document.pageCount} page${document.pageCount === 1 ? '' : 's'}` : '—'}</span>
            <span>•</span>
            <span>{formatSize(document.fileSizeBytes)}</span>
          </p>
        </div>

        <div className="relative flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-2 py-1 flex-shrink-0">
          <ToggleSwitch
            size="sm"
            checked={document.isActive}
            onChange={handleToggleActive}
            disabled={togglingActive}
            loading={togglingActive}
            ariaLabel={document.isActive ? 'Unpublish document' : 'Publish document'}
          />

          <KebabMenu
            size="sm"
            width="w-40"
            items={[
              { label: 'Preview', icon: <Eye size={15} />, onClick: () => setPreviewing(true) },
              { label: 'Edit details', icon: <Pencil size={15} />, onClick: openEdit },
              { label: 'Replace file', icon: <RefreshCw size={15} />, onClick: () => setReplacing(true) },
              { label: 'Delete', icon: <Trash2 size={15} />, variant: 'danger', onClick: onDelete },
            ]}
          />
        </div>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit details"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDetails} loading={saving}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <FormTextarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            showCharCount
            rows={3}
          />
          <FormInput
            label="Tags"
            helperText="Comma-separated."
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>
      </Modal>

      <Modal open={replacing} onClose={() => setReplacing(false)} title="Replace file" size="md">
        <DocumentFileUpload slug={document.slug} isReplace onUploaded={handleReplaced} />
      </Modal>

      {/* Reuses the exact same viewer the public /documents/[slug] route
          renders — no separate preview implementation to keep in sync. It
          only ever mounts while open, so an admin who never previews
          anything never pays for the react-pdf chunk.

          Deliberately not the shared Modal here: Modal's title row + its
          px-6 content padding are right for a form, but for a component that
          already ships its own full-width toolbar (nav/zoom/search/
          fullscreen/download/Contact/Website), stacking a second title bar
          on top just doubled the chrome and squeezed the real toolbar in on
          both sides — which is exactly what read as "cheap" and "too small".
          This is a plain lightbox instead: a near-fullscreen panel with no
          title text at all, and the one close control floating in the
          backdrop's own margin (outside the panel, lightbox-style) so it
          never competes with the Website/Contact buttons in the viewer's own
          top-right corner. */}
      {previewing && (
        <div
          // z-[60], not z-50: AdminHeader (sticky top-0 z-50) sits in a
          // different stacking context than this fixed overlay, so matching
          // its z-index would leave the two order-dependent instead of
          // reliably stacked — exactly the bug the kebab menu had. Clearing
          // it outright avoids relying on DOM order at all.
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewing(false);
          }}
        >
          <button
            type="button"
            onClick={() => setPreviewing(false)}
            aria-label="Close preview"
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white text-neutral-600 hover:text-black shadow-lg transition-colors"
          >
            <X size={20} />
          </button>

          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Preview: ${document.title}`}
            className="relative bg-white rounded-xl w-full h-full max-w-6xl shadow-2xl overflow-hidden"
          >
            <div className="h-full overflow-y-auto">
              <PdfViewerLoader
                fileUrl={withCacheBust(document.fileUrl, document.updatedAt)}
                slug={document.slug}
                title={document.title}
                thumbnailUrl={document.thumbnailUrl ? withCacheBust(document.thumbnailUrl, document.updatedAt) : null}
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
