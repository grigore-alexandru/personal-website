import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Layers,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { deduceMetadataFromFiles } from '../../utils/bulkDeduction';
import { StagingItem, BulkSelection } from '../../types/bulk';
import { BulkDropZone } from '../../components/admin/bulk/BulkDropZone';
import { BulkProjectSelector } from '../../components/admin/bulk/BulkProjectSelector';
import { StagingGrid } from '../../components/admin/bulk/StagingGrid';
import { BulkEditForm } from '../../components/admin/bulk/BulkEditForm';
import { BulkProgressFooter } from '../../components/admin/bulk/BulkProgressFooter';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILES = 100;

type Phase = 'drop' | 'project' | 'staging' | 'uploading';

interface ProjectOption {
  id: string;
  title: string;
  typeName: string;
}

export function BulkUploadPage() {
  const navigate = useNavigate();
  const { toasts, showToast, closeToast } = useToast();

  const [phase, setPhase] = useState<Phase>('drop');
  const [items, setItems] = useState<StagingItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selection, setSelection] = useState<BulkSelection>({ activeId: null, selectedIds: new Set() });
  const [showOverflowConfirm, setShowOverflowConfirm] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDeducing, setIsDeducing] = useState(false);

  const hasStaged = items.length > 0;

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasStaged) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasStaged]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, type_id, project_type:project_types(name)')
      .order('title');

    if (!error && data) {
      setProjects(
        data.map((p: any) => ({
          id: p.id,
          title: p.title,
          typeName: p.project_type?.name || '',
        }))
      );
    }
  };

  const processDroppedFiles = useCallback(
    async (rawFiles: File[]) => {
      const imageFiles = rawFiles.filter((f) => ALLOWED_IMAGE_MIME.includes(f.type));
      const rejected = rawFiles.length - imageFiles.length;

      if (rejected > 0) {
        showToast('error', `${rejected} file${rejected > 1 ? 's' : ''} rejected — only images (JPEG, PNG, WebP) are accepted`);
      }

      if (imageFiles.length === 0) return;

      if (imageFiles.length > MAX_FILES) {
        setPendingFiles(imageFiles);
        setShowOverflowConfirm(true);
        return;
      }

      await stageFiles(imageFiles);
    },
    [showToast]
  );

  const stageFiles = async (files: File[]) => {
    setIsDeducing(true);
    try {
      const staged = await deduceMetadataFromFiles(files);
      setItems(staged);
      setPhase('project');
    } catch {
      showToast('error', 'Failed to process files');
    } finally {
      setIsDeducing(false);
    }
  };

  const handleOverflowConfirm = async () => {
    setShowOverflowConfirm(false);
    await stageFiles(pendingFiles.slice(0, MAX_FILES));
    setPendingFiles([]);
  };

  const handleOverflowCancel = () => {
    setShowOverflowConfirm(false);
    setPendingFiles([]);
  };

  const handleProjectConfirm = () => {
    if (selectedProjectId) {
      setItems((prev) =>
        prev.map((item) =>
          item.isModified ? item : { ...item, projectId: selectedProjectId }
        )
      );
    }
    const firstId = items[0]?.localId ?? null;
    setSelection({
      activeId: firstId,
      selectedIds: firstId ? new Set([firstId]) : new Set(),
    });
    setPhase('staging');
  };

  const handleItemClick = useCallback(
    (localId: string, e: React.MouseEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      setSelection((prev) => {
        if (isCmd) {
          const next = new Set(prev.selectedIds);
          if (next.has(localId)) {
            next.delete(localId);
          } else {
            next.add(localId);
          }
          return { activeId: localId, selectedIds: next };
        }

        if (isShift && prev.activeId) {
          const ids = items.map((i) => i.localId);
          const anchorIdx = ids.indexOf(prev.activeId);
          const targetIdx = ids.indexOf(localId);
          const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
          const rangeIds = ids.slice(from, to + 1);
          return { activeId: localId, selectedIds: new Set(rangeIds) };
        }

        return { activeId: localId, selectedIds: new Set([localId]) };
      });
    },
    [items]
  );

  const updateItem = useCallback((localId: string, patch: Partial<StagingItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, ...patch, isModified: true } : item
      )
    );
  }, []);

  const applyToSelected = useCallback(
    (patch: Partial<Pick<StagingItem, 'projectId' | 'format' | 'caption' | 'publishedDate'>>) => {
      setItems((prev) =>
        prev.map((item) =>
          selection.selectedIds.has(item.localId)
            ? { ...item, ...patch, isModified: true }
            : item
        )
      );
    },
    [selection.selectedIds]
  );

  const removeItem = useCallback((localId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.localId !== localId);
      URL.revokeObjectURL(prev.find((i) => i.localId === localId)?.previewUrl ?? '');
      return next;
    });
    setSelection((prev) => {
      const next = new Set(prev.selectedIds);
      next.delete(localId);
      return {
        activeId: prev.activeId === localId ? null : prev.activeId,
        selectedIds: next,
      };
    });
  }, []);

  const handleStartUpload = () => {
    setPhase('uploading');
  };

  const activeItem = items.find((i) => i.localId === selection.activeId) ?? null;
  const selectedCount = selection.selectedIds.size;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const successCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <AdminLayout currentSection="Bulk Upload">
      <div className="flex flex-col h-[calc(100vh-80px)] -mt-8 -mx-6">

        {/* ── Phase: Drop ───────────────────────────────────────────────── */}
        {phase === 'drop' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
              <button
                onClick={() => navigate('/admin/content')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
              >
                <ArrowLeft size={16} />
                Content
              </button>
              <ChevronRight size={14} className="text-gray-300" />
              <span className="text-sm font-medium text-black">Bulk Upload</span>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
                    <Layers size={32} className="text-gray-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-black mb-2">Bulk Upload</h1>
                  <p className="text-gray-500">
                    Drop up to {MAX_FILES} images to stage them for publishing
                  </p>
                </div>

                <BulkDropZone
                  onFiles={processDroppedFiles}
                  isProcessing={isDeducing}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Phase: Project Selection ──────────────────────────────────── */}
        {phase === 'project' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
              <button
                onClick={() => { setPhase('drop'); setItems([]); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <ChevronRight size={14} className="text-gray-300" />
              <span className="text-sm font-medium text-black">Project Assignment</span>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              <BulkProjectSelector
                projects={projects}
                selectedProjectId={selectedProjectId}
                itemCount={items.length}
                onSelect={setSelectedProjectId}
                onConfirm={handleProjectConfirm}
              />
            </div>
          </div>
        )}

        {/* ── Phase: Staging / Editing ──────────────────────────────────── */}
        {(phase === 'staging' || phase === 'uploading') && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                {phase === 'staging' && (
                  <button
                    onClick={() => setPhase('project')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="font-medium text-black">{items.length}</span> items staged
                  {selectedCount > 1 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {selectedCount} selected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {successCount > 0 && (
                  <span className="flex items-center gap-1 text-sm text-emerald-600">
                    <CheckCircle2 size={14} />
                    {successCount} done
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle size={14} />
                    {errorCount} failed
                  </span>
                )}
                {phase === 'staging' && pendingCount > 0 && (
                  <button
                    onClick={handleStartUpload}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <UploadCloud size={16} />
                    Upload {pendingCount} item{pendingCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <StagingGrid
                items={items}
                selection={selection}
                onItemClick={handleItemClick}
                onRemove={removeItem}
              />

              {activeItem && (
                <BulkEditForm
                  item={activeItem}
                  projects={projects}
                  selectedCount={selectedCount}
                  onUpdate={updateItem}
                  onApplyToSelected={applyToSelected}
                />
              )}
            </div>

            {phase === 'uploading' && (
              <BulkProgressFooter
                items={items}
                onItemUpdate={(localId, patch) =>
                  setItems((prev) =>
                    prev.map((i) => (i.localId === localId ? { ...i, ...patch } : i))
                  )
                }
                onDone={() => showToast('success', 'Bulk upload complete')}
                showToast={showToast}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Overflow confirmation dialog ──────────────────────────────── */}
      {showOverflowConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={22} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-black">Too many files</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You dropped <strong>{pendingFiles.length}</strong> files, but the limit is{' '}
                  <strong>{MAX_FILES}</strong> per batch. Only the first {MAX_FILES} will be staged.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleOverflowCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOverflowConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
              >
                Stage first {MAX_FILES}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </AdminLayout>
  );
}
