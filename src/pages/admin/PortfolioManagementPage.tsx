import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { SearchBar } from '../../components/ui/SearchBar';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminProjectCard } from '../../components/admin/AdminProjectCard';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import { ProjectType } from '../../types';
import { loadProjectTypes, toggleProjectDraft, deleteProject, updateProjectsOrder } from '../../utils/portfolioService';

interface ProjectListItem {
  id: string;
  title: string;
  slug: string;
  client_name: string;
  type_id: string;
  type_name: string;
  hero_image_thumbnail: string;
  is_draft: boolean;
  order_index: number;
  updated_at: string;
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

export function PortfolioManagementPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
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

  const isFiltered = activeFilter !== 'all' || typeFilter !== 'all' || searchQuery.trim() !== '';

  useEffect(() => {
    loadData();
  }, []);

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
        setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFiltered, filteredProjects]);

  const loadData = async () => {
    setLoading(true);
    const types = await loadProjectTypes();
    setProjectTypes(types);

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, slug, client_name, type_id, hero_image_thumbnail, is_draft, order_index, updated_at, project_type:project_types(name)')
      .order('order_index', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      showToast('error', 'Failed to load projects');
    } else {
      setProjects(
        (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          client_name: p.client_name,
          type_id: p.type_id,
          type_name: p.project_type?.name || '',
          hero_image_thumbnail: p.hero_image_thumbnail,
          is_draft: p.is_draft,
          order_index: p.order_index ?? 0,
          updated_at: p.updated_at,
        }))
      );
    }
    setLoading(false);
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (activeFilter === 'published') return !p.is_draft;
        if (activeFilter === 'drafts') return p.is_draft;
        return true;
      })
      .filter((p) => {
        if (typeFilter !== 'all') return p.type_id === typeFilter;
        return true;
      })
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q);
      })
      .sort((a, b) => b.order_index - a.order_index);
  }, [projects, activeFilter, typeFilter, searchQuery]);

  const handleEdit = (projectId: string) => {
    navigate(`/admin/portfolio/project/edit/${projectId}`);
  };

  const handleToggleStatus = async (projectId: string, currentIsDraft: boolean): Promise<void> => {
    const result = await toggleProjectDraft(projectId, !currentIsDraft);
    if (result.success) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, is_draft: !currentIsDraft } : p))
      );
      showToast('success', currentIsDraft ? 'Project published' : 'Project unpublished');
    } else {
      showToast('error', result.error || 'Failed to update project status');
    }
  };

  const handleDelete = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);

    const result = await deleteProject(projectToDelete);
    if (result.success) {
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(projectToDelete);
        return next;
      });
      showToast('success', 'Project deleted');
    } else {
      showToast('error', result.error || 'Failed to delete project');
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setProjectToDelete(null);
  };

  const handleCardClick = useCallback((e: React.MouseEvent, projectId: string) => {
    if (isFiltered) return;
    const isMulti = e.ctrlKey || e.metaKey;
    if (isMulti) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(projectId)) next.delete(projectId);
        else next.add(projectId);
        return next;
      });
    } else {
      setSelectedIds(new Set([projectId]));
    }
  }, [isFiltered]);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    if (isFiltered) return;
    if (!selectedIds.has(projectId)) {
      setSelectedIds(new Set([projectId]));
    }
    setDraggedId(projectId);
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', projectId);
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

    if (!currentDraggedId) return;

    const idsToMove = currentSelected.size > 0 ? [...currentSelected] : [currentDraggedId];

    if (idsToMove.length === 1 && idsToMove[0] === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const targetIndex = filteredProjects.findIndex((p) => p.id === targetId);
    if (targetIndex === -1) return;

    const movingItems = filteredProjects.filter((p) => idsToMove.includes(p.id));
    const stationaryItems = filteredProjects.filter((p) => !idsToMove.includes(p.id));

    const targetInStationary = stationaryItems.findIndex((p) => p.id === targetId);

    let insertIndex: number;
    if (targetInStationary === -1) {
      insertIndex = stationaryItems.length;
    } else {
      const draggedPivot = filteredProjects.findIndex((p) => p.id === currentDraggedId);
      insertIndex = draggedPivot < targetIndex ? targetInStationary + 1 : targetInStationary;
    }

    const newOrder = [
      ...stationaryItems.slice(0, insertIndex),
      ...movingItems,
      ...stationaryItems.slice(insertIndex),
    ];

    const updatedItems = newOrder.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    setProjects((prev) => {
      const updated = [...prev];
      updatedItems.forEach((item) => {
        const idx = updated.findIndex((p) => p.id === item.id);
        if (idx !== -1) updated[idx] = item;
      });
      return updated;
    });

    const orderUpdates = updatedItems.map((item) => ({
      id: item.id,
      order_index: item.order_index,
    }));

    const result = await updateProjectsOrder(orderUpdates);
    if (!result.success) {
      showToast('error', result.error || 'Failed to update order');
      loadData();
    } else {
      const count = idsToMove.length;
      showToast('success', count > 1 ? `Moved ${count} projects` : 'Project order updated');
    }

    setDraggedId(null);
    setDragOverId(null);
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
      for (const item of filteredProjects) {
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
    [filteredProjects]
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

  const rbRect = rubberBand.active ? getRubberBandRect(rubberBand) : null;
  const publishedCount = projects.filter((p) => !p.is_draft).length;
  const draftsCount = projects.filter((p) => p.is_draft).length;
  const isDraggingMultiple = draggedId !== null && selectedIds.size > 1;

  return (
    <AdminLayout currentSection="Portfolio Management">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-black mb-2">Projects</h2>
          <p className="text-gray-600">Manage your portfolio projects</p>
        </div>
        <button
          onClick={() => navigate('/admin/portfolio/project/create')}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'all' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-black'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setActiveFilter('published')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'published' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-black'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setActiveFilter('drafts')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'drafts' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-black'
            }`}
          >
            Drafts ({draftsCount})
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search projects..."
            size="sm"
            className="flex-1 max-w-xs"
          />

          {projectTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Types</option>
              {projectTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
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
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">
            {searchQuery || typeFilter !== 'all'
              ? 'No matching projects found'
              : activeFilter === 'all'
              ? 'No projects yet'
              : activeFilter === 'published'
              ? 'No published projects'
              : 'No draft projects'}
          </p>
          {!searchQuery && typeFilter === 'all' && activeFilter === 'all' && (
            <button
              onClick={() => navigate('/admin/portfolio/project/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={20} />
              <span>Create Your First Project</span>
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
            className="grid grid-cols-1 gap-4"
            onDragOver={(e) => e.preventDefault()}
          >
            {filteredProjects.map((project) => (
              <AdminProjectCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                onDragStart={!isFiltered ? handleDragStart : undefined}
                onDragOver={!isFiltered ? handleDragOver : undefined}
                onDrop={!isFiltered ? handleDrop : undefined}
                onDragEnd={!isFiltered ? handleDragEnd : undefined}
                onCardClick={!isFiltered ? handleCardClick : undefined}
                isDragging={draggedId !== null && selectedIds.has(project.id)}
                isDragOver={dragOverId === project.id}
                isSelected={selectedIds.has(project.id)}
                isDraggingActive={draggedId !== null}
                dragCount={isDraggingMultiple ? selectedIds.size : 0}
                isPivot={draggedId === project.id}
                dragDisabled={isFiltered}
                cardRef={(el) => {
                  if (el) cardRefsMap.current.set(project.id, el);
                  else cardRefsMap.current.delete(project.id);
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
          <span className="text-sm font-semibold">
            {selectedIds.size} {selectedIds.size === 1 ? 'project' : 'projects'} selected
          </span>
          <div className="w-px h-5 bg-gray-600" />
          <span className="text-xs text-gray-500 hidden sm:inline">Drag to reorder</span>
          <div className="w-px h-5 bg-gray-600 hidden sm:block" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
          <kbd className="hidden sm:inline text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded border border-gray-600">Esc</kbd>
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
            <h3 className="text-xl font-bold text-black mb-2">Delete Project</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModalOpen(false); setProjectToDelete(null); }}
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
