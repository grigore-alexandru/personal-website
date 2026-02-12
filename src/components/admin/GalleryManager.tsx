import { useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown, Film, ImageIcon, FolderOpen } from 'lucide-react';
import { Content, ContentType } from '../../types';
import { ContentBrowser } from './ContentBrowser';
import { ContentCreateModal } from './ContentCreateModal';

export interface GalleryItem {
  content_id: string;
  content: Content;
  order_index: number;
}

interface GalleryManagerProps {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function GalleryManager({ items, onChange, onSuccess, onError }: GalleryManagerProps) {
  const [browserOpen, setBrowserOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleBrowseSelect = (selectedContent: Content[]) => {
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) + 1 : 0;
    const newItems = selectedContent.map((c, idx) => ({
      content_id: c.id,
      content: c,
      order_index: maxOrder + idx,
    }));
    onChange([...items, ...newItems]);
  };

  const handleRemove = (contentId: string) => {
    const filtered = items.filter((i) => i.content_id !== contentId);
    onChange(filtered.map((item, idx) => ({ ...item, order_index: idx })));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems.map((item, idx) => ({ ...item, order_index: idx })));
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems.map((item, idx) => ({ ...item, order_index: idx })));
  };

  const handleContentCreated = (content: Content) => {
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) + 1 : 0;
    onChange([...items, { content_id: content.id, content, order_index: maxOrder }]);
    onSuccess('Content created and added to gallery');
    setCreateModalOpen(false);
  };

  const getPreviewUrl = (item: Content) => {
    const isVideo = item.content_type?.slug === 'video';
    if (isVideo && item.thumbnail) {
      const thumb = item.thumbnail as { thum_image?: string; thum_gif?: string };
      return thumb.thum_image || thumb.thum_gif || null;
    }
    if (!isVideo) return item.url;
    return null;
  };

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => {
            const isVideo = item.content.content_type?.slug === 'video';
            const previewUrl = getPreviewUrl(item.content);

            return (
              <div
                key={item.content_id}
                className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-lg p-3"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    className="p-0.5 text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className="w-20 h-12 bg-neutral-200 rounded overflow-hidden flex-shrink-0">
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isVideo ? <Film size={16} className="text-neutral-400" /> : <ImageIcon size={16} className="text-neutral-400" />}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{item.content.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      isVideo ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {isVideo ? 'Video' : 'Image'}
                    </span>
                    {item.content.platform && (
                      <span className="text-[10px] text-neutral-500 capitalize">{item.content.platform}</span>
                    )}
                    <span className="text-[10px] text-neutral-400 capitalize">{item.content.format}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(item.content_id)}
                  className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 && !showNewForm && (
        <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-lg">
          <FolderOpen size={32} className="mx-auto text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-500">No gallery items yet.</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setBrowserOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <FolderOpen size={16} />
          Browse Existing
        </button>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <Plus size={16} />
          Create New
        </button>
      </div>

      <ContentBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={handleBrowseSelect}
        excludeIds={items.map((i) => i.content_id)}
      />

      <ContentCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleContentCreated}
        onError={onError}
      />
    </div>
  );
}
