import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { SearchBar } from '../../components/ui/SearchBar';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminContentCard } from '../../components/admin/AdminContentCard';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import { ContentType } from '../../types';
import {
  loadAllContentForAdmin,
  loadContentTypes,
  toggleContentDraft,
  deleteContent,
  updateContentOrder,
  type ContentAdminItem,
} from '../../utils/contentService';
import { supabase } from '../../lib/supabase';

interface ContentListItem {
  id: string;
  title: string;
  slug: string;
  type_id: string;
  type_name: string;
  format: 'landscape' | 'portrait';
  platform: string | null;
  thumbnail: any;
  is_draft: boolean;
  order_index: number;
  project_id: string | null;
  project_title: string | null;
}

type FilterType = 'all' | 'published' | 'drafts';

interface RubberBand {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
}

const SCROLL_ZONE = 80;
const SCROLL_SPEED = 12;

export function ContentManagementPage() {
  const [content, setContent] = useState<ContentListItem[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [rubberBand, setRubberBand] = useState<RubberBand>({
    startX: 0, startY: 0, currentX: 0, currentY: 0, active: false,
  });

  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const scrollRafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const navigate = useNavigate();
  const { toasts, showToast, closeToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const types = await loadContentTypes();
    setContentTypes(types);

    const contentData = await loadAllContentForAdmin();
    setContent(
      contentData.map((c: ContentAdminItem) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        type_id: c.type_id,
        type_name: c.content_type?.name || '',
        format: c.format,
        platform: c.platform,
        thumbnail: c.thumbnail,
        is_draft: c.is_draft,
        order_index: c.order_index,
        project_id: c.project_id,
        project_title: c.project_title,
      }))
    );

    setLoading(false);
  };

  const filteredContent = useMemo(() => {
    return content
      .filter((c) => {
        if (activeFilter === 'published') return !c.is_draft;
        if (activeFilter === 'drafts') return c.is_draft;
        return true;
      })
      .filter((c) => {
        if (typeFilter !== 'all') return c.type_id === typeFilter;
        return true;
      })
      .filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return c.title.toLowerCase().includes(q);
      })
      .sort((a, b) => b.order_index - a.order_index);
  }, [content, activeFilter, typeFilter, searchQuery]);

  const isFiltered = activeFilter !== 'all' || typeFilter !== 'all' || searchQuery.trim() !== '';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (isFiltered) return;
        const activeEl = document.activeElement as HTMLElement | null;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
        if (isInput) return;
        e.preventDefault();
        setSelectedIds(new Set(filteredContent.map((c) => c.id)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFiltered, filteredContent]);

  const handleEdit = (contentId: string) => {
    navigate(`/admin/content/edit/${contentId}`);
  };

  const handleToggleStatus = async (
    contentId: string,
    currentIsDraft: boolean
  ): Promise<void> => {
    const result = await toggleContentDraft(contentId, !currentIsDraft);
    if (result.success) {
      setContent((prev) =>
        prev.map((c) => (c.id === contentId ? { ...c, is_draft: !currentIsDraft } : c))
      );
      showToast('success', currentIsDraft ? 'Content published' : 'Content unpublished');
    } else {
      showToast('error', result.error || 'Failed to update content status');
    }
  };

  const handleDelete = (contentId: string) => {
    setContentToDelete(contentId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!contentToDelete) return;
    setIsDeleting(true);

    const result = await deleteContent(contentToDelete);
    if (result.success) {
      setContent((prev) => prev.filter((c) => c.id !== contentToDelete));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(contentToDelete);
        return next;
      });
      showToast('success', 'Content deleted');
    } else {
      showToast('error', result.error || 'Failed to delete content');
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setContentToDelete(null);
  };

  const handleCardClick = useCallback((e: React.MouseEvent, contentId: string) => {
    if (isFiltered) return;
    const isMulti = e.ctrlKey || e.metaKey;
    if (isMulti) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(contentId)) {
          next.delete(contentId);
        } else {
          next.add(contentId);
        }
        return next;
      });
    } else {
      setSelectedIds(new Set([contentId]));
    }
  }, [isFiltered]);

  const handleDragStart = (e: React.DragEvent, contentId: string) => {
    if (isFiltered) return;
    if (!selectedIds.has(contentId)) {
      setSelectedIds(new Set([contentId]));
    }
    setDraggedId(contentId);
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', contentId);
    startAutoScroll();
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    if (isFiltered) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(targetId);
    handleAutoScrollOnMove(e.clientY);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    stopAutoScroll();

    if (isFiltered) return;

    const currentDraggedId = draggedId;
    const currentSelected = new Set(selectedIds);

    setDraggedId(null);
    setDragOverId(null);

    if (!currentDraggedId) return;

    const idsToMove = new Set(currentSelected.size > 0 ? [...currentSelected] : [currentDraggedId]);

    if (idsToMove.size === 1 && idsToMove.has(targetId)) return;

    if (idsToMove.has(targetId)) return;

    const visualList = [...filteredContent];

    const targetVisualIdx = visualList.findIndex((c) => c.id === targetId);
    if (targetVisualIdx === -1) return;

    const movingItems = visualList.filter((c) => idsToMove.has(c.id));
    const stationaryItems = visualList.filter((c) => !idsToMove.has(c.id));

    const targetInStationary = stationaryItems.findIndex((c) => c.id === targetId);

    const newVisualOrder = [
      ...stationaryItems.slice(0, targetInStationary),
      ...movingItems,
      ...stationaryItems.slice(targetInStationary),
    ];

    const total = newVisualOrder.length;
    const updatedItems = newVisualOrder.map((item, visualIdx) => ({
      ...item,
      order_index: total - 1 - visualIdx,
    }));

    setContent((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      updatedItems.forEach((item) => map.set(item.id, item));
      return [...map.values()];
    });

    const orderUpdates = updatedItems.map((item) => ({
      id: item.id,
      order_index: item.order_index,
    }));

    const result = await updateContentOrder(orderUpdates);
    if (!result.success) {
      showToast('error', result.error || 'Failed to update order');
      loadData();
    } else {
      const count = idsToMove.size;
      showToast('success', count > 1 ? `Moved ${count} items` : 'Content order updated');
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    isDraggingRef.current = false;
    stopAutoScroll();
  };

  const startAutoScroll = () => {
    const tick = () => {
      if (!isDraggingRef.current) return;
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  };

  const handleAutoScrollOnMove = (clientY: number) => {
    if (!isDraggingRef.current) return;
    const vh = window.innerHeight;

    if (clientY < SCROLL_ZONE) {
      const intensity = 1 - clientY / SCROLL_ZONE;
      window.scrollBy(0, -SCROLL_SPEED * intensity);
    } else if (clientY > vh - SCROLL_ZONE) {
      const intensity = 1 - (vh - clientY) / SCROLL_ZONE;
      window.scrollBy(0, SCROLL_SPEED * intensity);
    }
  };

  const stopAutoScroll = () => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  };

  const getCardRect = (id: string): DOMRect | null => {
    const el = cardRefsMap.current.get(id);
    return el ? el.getBoundingClientRect() : null;
  };

  const getRubberBandRect = (rb: RubberBand) => {
    const x = Math.min(rb.startX, rb.currentX);
    const y = Math.min(rb.startY, rb.currentY);
    const w = Math.abs(rb.currentX - rb.startX);
    const h = Math.abs(rb.currentY - rb.startY);
    return { x, y, w, h };
  };

  const getItemsInRect = useCallback(
    (rect: { x: number; y: number; w: number; h: number }) => {
      if (rect.w < 4 && rect.h < 4) return [];
      const ids: string[] = [];
      for (const item of filteredContent) {
        const cardRect = getCardRect(item.id);
        if (!cardRect) continue;
        const overlap =
          cardRect.left < rect.x + rect.w &&
          cardRect.right > rect.x &&
          cardRect.top < rect.y + rect.h &&
          cardRect.bottom > rect.y;
        if (overlap) ids.push(item.id);
      }
      return ids;
    },
    [filteredContent]
  );

  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFiltered) return;
    const target = e.target as HTMLElement;
    const isCard = target.closest('article');
    if (isCard) return;
    if (e.button !== 0) return;

    if (!e.ctrlKey && !e.metaKey) {
      setSelectedIds(new Set());
    }

    setRubberBand({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      active: true,
    });

    e.preventDefault();
  };

  const handleGridMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!rubberBand.active) return;
      const updated = { ...rubberBand, currentX: e.clientX, currentY: e.clientY };
      setRubberBand(updated);

      const rect = getRubberBandRect(updated);
      const ids = getItemsInRect(rect);
      setSelectedIds(new Set(ids));
    },
    [rubberBand, getItemsInRect]
  );

  const handleGridMouseUp = useCallback(() => {
    if (!rubberBand.active) return;
    setRubberBand((prev) => ({ ...prev, active: false }));
  }, [rubberBand.active]);

  useEffect(() => {
    if (rubberBand.active) {
      window.addEventListener('mousemove', handleGridMouseMove);
      window.addEventListener('mouseup', handleGridMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGridMouseMove);
      window.removeEventListener('mouseup', handleGridMouseUp);
    };
  }, [rubberBand.active, handleGridMouseMove, handleGridMouseUp]);

  const handleBulkPublish = async (isDraft: boolean) => {
    const ids = [...selectedIds];
    const promises = ids.map((id) => {
      const item = content.find((c) => c.id === id);
      if (!item) return Promise.resolve();
      if (item.is_draft === isDraft) return Promise.resolve();
      return supabase.from('content').update({ is_draft: isDraft }).eq('id', id);
    });
    await Promise.all(promises);
    setContent((prev) =>
      prev.map((c) => (selectedIds.has(c.id) ? { ...c, is_draft: isDraft } : c))
    );
    showToast('success', isDraft ? `${ids.length} items unpublished` : `${ids.length} items published`);
  };

  const rbRect = rubberBand.active ? getRubberBandRect(rubberBand) : null;

  const publishedCount = content.filter((c) => !c.is_draft).length;
  const draftsCount = content.filter((c) => c.is_draft).length;

  const videoTypes = contentTypes.filter((t) => t.name.toLowerCase().includes('video'));
  const imageTypes = contentTypes.filter((t) => t.name.toLowerCase().includes('image'));

  const isDraggingMultiple = draggedId !== null && selectedIds.size > 1;

  return (
    <AdminLayout currentSection="Content Management">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-black mb-2">Content</h2>
          <p className="text-gray-600">
            Manage media content ({content.length} {content.length === 1 ? 'item' : 'items'})
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/content/create')}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          <Plus size={20} />
          <span>New Content</span>
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'all'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            All ({content.length})
          </button>
          <button
            onClick={() => setActiveFilter('published')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'published'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setActiveFilter('drafts')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'drafts'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            Drafts ({draftsCount})
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search content..."
            size="sm"
            className="flex-1 max-w-xs"
          />

          {contentTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Types</option>
              {videoTypes.length > 0 && (
                <optgroup label="Videos">
                  {videoTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {imageTypes.length > 0 && (
                <optgroup label="Images">
                  {imageTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
        </div>
      </div>

      {isFiltered && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>Clear filters to enable drag-and-drop reordering</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-gray-400 animate-spin" />
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">
            {searchQuery || typeFilter !== 'all'
              ? 'No matching content found'
              : activeFilter === 'all'
              ? 'No content yet'
              : activeFilter === 'published'
              ? 'No published content'
              : 'No draft content'}
          </p>
          {!searchQuery && typeFilter === 'all' && activeFilter === 'all' && (
            <button
              onClick={() => navigate('/admin/content/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={20} />
              <span>Create Your First Content</span>
            </button>
          )}
        </div>
      ) : (
        <div
          ref={gridRef}
          className="relative select-none"
          onMouseDown={handleGridMouseDown}
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
            onDragOver={(e) => e.preventDefault()}
          >
            {filteredContent.map((contentItem) => (
              <AdminContentCard
                key={contentItem.id}
                content={contentItem}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onCardClick={handleCardClick}
                isDragging={draggedId !== null && selectedIds.has(contentItem.id)}
                isDragOver={dragOverId === contentItem.id}
                isSelected={selectedIds.has(contentItem.id)}
                isDraggingActive={draggedId !== null}
                dragCount={isDraggingMultiple ? selectedIds.size : 0}
                isPivot={draggedId === contentItem.id}
                projectId={contentItem.project_id}
                projectTitle={contentItem.project_title}
                cardRef={(el) => {
                  if (el) cardRefsMap.current.set(contentItem.id, el);
                  else cardRefsMap.current.delete(contentItem.id);
                }}
              />
            ))}
          </div>

          {rubberBand.active && rbRect && rbRect.w > 2 && rbRect.h > 2 && (
            <div
              className="fixed pointer-events-none z-50 border-2 border-blue-500 bg-blue-500/10 rounded"
              style={{
                left: rbRect.x,
                top: rbRect.y,
                width: rbRect.w,
                height: rbRect.h,
              }}
            />
          )}
        </div>
      )}

      {selectedIds.size > 0 && !draggedId && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700"
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          <span className="text-sm font-semibold text-gray-200">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={() => handleBulkPublish(false)}
            className="flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
          >
            <Eye size={15} />
            Publish All
          </button>
          <button
            onClick={() => handleBulkPublish(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <EyeOff size={15} />
            Unpublish All
          </button>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <X size={15} />
            Deselect
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-2">Delete Content</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this content? This action cannot be undone and will
              remove all associated files.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setContentToDelete(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
