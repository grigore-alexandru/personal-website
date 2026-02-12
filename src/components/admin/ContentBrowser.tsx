import { useState, useEffect } from 'react';
import { Search, X, Check, Film, ImageIcon, Loader2, Folder } from 'lucide-react';
import { Content } from '../../types';
import { loadContentWithProjects } from '../../utils/contentService';

type ContentWithProjects = Content & { projects?: Array<{ id: string; title: string }> };

interface ContentBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: Content[]) => void;
  excludeIds: string[];
}

export function ContentBrowser({ open, onClose, onSelect, excludeIds }: ContentBrowserProps) {
  const [allContent, setAllContent] = useState<ContentWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'image'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch('');
      loadContent();
    }
  }, [open]);

  const loadContent = async () => {
    setLoading(true);
    const data = await loadContentWithProjects();
    setAllContent(data);
    setLoading(false);
  };

  if (!open) return null;

  const filtered = allContent
    .filter((c) => !excludeIds.includes(c.id))
    .filter((c) => {
      if (typeFilter === 'video') return c.content_type?.slug === 'video';
      if (typeFilter === 'image') return c.content_type?.slug === 'image';
      return true;
    })
    .filter((c) => {
      if (!search.trim()) return true;
      return c.title.toLowerCase().includes(search.toLowerCase());
    });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleConfirm = () => {
    const items = allContent.filter((c) => selected.has(c.id));
    onSelect(items);
    onClose();
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h3 className="text-xl font-bold text-black">Browse Content</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
            {(['all', 'video', 'image'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  typeFilter === t ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                {t === 'all' ? 'All' : t === 'video' ? 'Videos' : 'Images'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="text-neutral-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              {search ? 'No matching content found.' : 'No content available.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map((item) => {
                const isSelected = selected.has(item.id);
                const isVideo = item.content_type?.slug === 'video';
                const previewUrl = getPreviewUrl(item);
                const hasProjects = item.projects && item.projects.length > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelect(item.id)}
                    className={`group relative rounded-lg overflow-hidden border-2 transition-all text-left ${
                      isSelected
                        ? 'border-black ring-2 ring-black/20'
                        : 'border-neutral-200 hover:border-neutral-400'
                    } ${!hasProjects ? 'opacity-50 grayscale-[30%]' : ''}`}
                  >
                    <div className="aspect-video bg-neutral-100 relative">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isVideo ? (
                            <Film size={32} className="text-neutral-300" />
                          ) : (
                            <ImageIcon size={32} className="text-neutral-300" />
                          )}
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <Check size={18} className="text-black" />
                          </div>
                        </div>
                      )}

                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isVideo ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isVideo ? 'Video' : 'Image'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2">
                      <p className="text-xs font-medium text-neutral-900 truncate">{item.title}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {item.platform && (
                          <p className="text-[10px] text-neutral-500 capitalize">{item.platform}</p>
                        )}
                        {hasProjects && (
                          <>
                            {item.platform && <span className="text-neutral-300">•</span>}
                            <div className="flex items-center gap-1">
                              <Folder size={10} className="text-neutral-400" />
                              <span className="text-[10px] text-neutral-600 font-medium">
                                {item.projects!.length} project{item.projects!.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </>
                        )}
                        {!hasProjects && (
                          <span className="text-[10px] text-neutral-400 italic">Unassigned</span>
                        )}
                      </div>
                      {hasProjects && item.projects!.length <= 2 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.projects!.map((project) => (
                            <span
                              key={project.id}
                              className="text-[9px] px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded truncate max-w-full"
                              title={project.title}
                            >
                              {project.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            {selected.size} item{selected.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:text-black border border-neutral-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
