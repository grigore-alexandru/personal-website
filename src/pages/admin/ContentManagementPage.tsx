import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Search } from 'lucide-react';
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
} from '../../utils/contentService';

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
}

type FilterType = 'all' | 'published' | 'drafts';

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
      contentData.map((c) => ({
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
      .sort((a, b) => a.order_index - b.order_index);
  }, [content, activeFilter, typeFilter, searchQuery]);

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
      showToast('success', 'Content deleted');
    } else {
      showToast('error', result.error || 'Failed to delete content');
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setContentToDelete(null);
  };

  const handleDragStart = (e: React.DragEvent, contentId: string) => {
    setDraggedId(contentId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', contentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = filteredContent.findIndex((c) => c.id === draggedId);
    const targetIndex = filteredContent.findIndex((c) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newContent = [...filteredContent];
    const [draggedItem] = newContent.splice(draggedIndex, 1);
    newContent.splice(targetIndex, 0, draggedItem);

    const updatedItems = newContent.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    setContent((prev) => {
      const updated = [...prev];
      updatedItems.forEach((item) => {
        const idx = updated.findIndex((c) => c.id === item.id);
        if (idx !== -1) {
          updated[idx] = item;
        }
      });
      return updated;
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
      showToast('success', 'Content order updated');
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const publishedCount = content.filter((c) => !c.is_draft).length;
  const draftsCount = content.filter((c) => c.is_draft).length;

  const videoTypes = contentTypes.filter((t) => t.name.toLowerCase().includes('video'));
  const imageTypes = contentTypes.filter((t) => t.name.toLowerCase().includes('image'));
  const videoTypeIds = videoTypes.map((t) => t.id);
  const imageTypeIds = imageTypes.map((t) => t.id);

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
          <div className="relative flex-1 max-w-xs">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            />
          </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
              isDragging={draggedId === contentItem.id}
              isDragOver={dragOverId === contentItem.id}
            />
          ))}
        </div>
      )}

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
