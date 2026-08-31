'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Plus } from 'lucide-react';
import { SearchBar } from '../../../components/ui/SearchBar';
import { ToastContainer } from '../../../components/ui/Toast';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DocumentCard } from '../../../components/documents/DocumentCard';
import { NewDocumentCard } from '../../../components/documents/NewDocumentCard';
import { useToast } from '../../../hooks/useToast';
import { createDocument, deleteDocument, listDocuments, updateDocument } from '../../../utils/documentsService';
import { deleteByUrl } from '../../../lib/storageClient';
import type { Document as DocumentRecord, DocumentPatch, NewDocumentInput } from '../../../types/documents';

/**
 * Interim admin page — bare-bones by design (no styling pass, no bulk
 * actions, no tag filtering yet), but built entirely on the same
 * documentsService.ts functions a future polished manager would use. The
 * DB's revalidate_on_documents_change trigger busts the static
 * /documents/[slug] page automatically on every write here — nothing in
 * this file has to remember to call /api/revalidate itself.
 */
export default function DocumentsManagementPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const [documentToDelete, setDocumentToDelete] = useState<DocumentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { toasts, showToast, closeToast } = useToast();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not load documents');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handlePatch = useCallback(async (id: string, patch: DocumentPatch) => {
    const updated = await updateDocument(id, patch);
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }, []);

  const handleCreate = async (input: NewDocumentInput) => {
    const created = await createDocument(input);
    setDocuments((prev) => [created, ...prev]);
    setCreating(false);
    showToast('success', 'Document created');
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;
    setDeleting(true);
    try {
      await deleteDocument(documentToDelete.id);
      await Promise.all([
        deleteByUrl(documentToDelete.fileUrl),
        deleteByUrl(documentToDelete.thumbnailUrl),
      ]);
      setDocuments((prev) => prev.filter((d) => d.id !== documentToDelete.id));
      showToast('success', 'Document deleted');
      setDocumentToDelete(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not delete this document');
    } finally {
      setDeleting(false);
    }
  };

  const visibleDocuments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((d) =>
      [d.title, d.slug, d.description ?? '', ...(d.tags ?? [])].join(' ').toLowerCase().includes(needle)
    );
  }, [documents, search]);

  return (
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-black mb-2">Documents</h2>
          <p className="text-gray-600">PDF presentations rendered at /documents/&lt;slug&gt;</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 flex-shrink-0"
        >
          <Plus size={20} />
          <span>New Document</span>
        </button>
      </div>

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search documents by title, slug, or tag..."
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {creating && <NewDocumentCard onCreate={handleCreate} onCancel={() => setCreating(false)} />}

          {visibleDocuments.length === 0 && !creating ? (
            <div className="text-center py-20">
              <FileText size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">
                {search ? 'No documents match that search' : 'No documents yet'}
              </p>
              {!search && (
                <button
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus size={20} />
                  <span>Upload Your First Document</span>
                </button>
              )}
            </div>
          ) : (
            visibleDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onPatch={handlePatch}
                onDelete={() => setDocumentToDelete(document)}
                onToast={showToast}
              />
            ))
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!documentToDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.title ?? ''}"? This action cannot be undone.`}
        note="The PDF and its thumbnail will be removed from storage, and any shared link to it will stop working."
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        loading={deleting}
        onCancel={() => setDocumentToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
