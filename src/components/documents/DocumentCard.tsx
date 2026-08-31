'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ExternalLink, FileText, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { KebabMenu } from '../ui/KebabMenu';
import { Modal } from '../ui/Modal';
import { FormInput } from '../forms/FormInput';
import { FormTextarea } from '../forms/FormTextarea';
import { Button } from '../forms/Button';
import { DocumentFileUpload, type UploadedDocumentFile } from './DocumentFileUpload';
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
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description ?? '');
  const [tagsInput, setTagsInput] = useState((document.tags ?? []).join(', '));

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

  return (
    <article className="bg-white border border-gray-100 rounded-lg hover:shadow-lg hover:border-gray-200 transition-all duration-300">
      <div className="p-5 flex items-start gap-4">
        <div className="w-16 h-20 flex-shrink-0 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center">
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
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-black truncate mb-0.5">{document.title}</h2>
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
          <p className="text-xs text-neutral-400 mt-2">
            {document.pageCount ? `${document.pageCount} page${document.pageCount === 1 ? '' : 's'}` : '—'}
            {' • '}
            {formatSize(document.fileSizeBytes)}
          </p>
        </div>

        <KebabMenu
          items={[
            { label: 'Edit details', icon: <Pencil size={15} />, onClick: openEdit },
            { label: 'Replace file', icon: <RefreshCw size={15} />, onClick: () => setReplacing(true) },
            { label: 'Delete', icon: <Trash2 size={15} />, variant: 'danger', onClick: onDelete },
          ]}
        />
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
    </article>
  );
}
