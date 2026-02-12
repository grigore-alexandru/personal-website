import { useState } from 'react';
import { Edit, MoreVertical, Loader2, Video, Image as ImageIcon, GripVertical } from 'lucide-react';

interface AdminContentCardProps {
  content: {
    id: string;
    title: string;
    slug: string;
    type_name: string;
    format: 'landscape' | 'portrait';
    platform: string | null;
    thumbnail: any;
    is_draft: boolean;
    order_index: number;
  };
  onEdit: (contentId: string) => void;
  onToggleStatus: (contentId: string, currentIsDraft: boolean) => Promise<void>;
  onDelete: (contentId: string) => void;
  onDragStart: (e: React.DragEvent, contentId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export function AdminContentCard({
  content,
  onEdit,
  onToggleStatus,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}: AdminContentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsToggling(true);
    try {
      await onToggleStatus(content.id, content.is_draft);
    } finally {
      setIsToggling(false);
    }
  };

  const isVideo = content.thumbnail && 'poster' in content.thumbnail;
  const thumbnailUrl = isVideo
    ? content.thumbnail.poster
    : content.thumbnail?.compressed || content.thumbnail?.full;

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, content.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, content.id)}
      onDragEnd={onDragEnd}
      className={`relative bg-white border rounded-lg overflow-hidden transition-all duration-300 group cursor-move ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDragOver ? 'border-black border-2 bg-gray-50' : 'border-gray-200 hover:shadow-lg hover:border-gray-300'}`}
    >
      <div className="absolute top-2 left-2 z-10">
        <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-bold">
          #{content.order_index}
        </div>
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg border border-gray-200 px-2 py-1 flex items-center gap-1">
          {isToggling ? (
            <Loader2 size={14} className="text-gray-400 animate-spin" />
          ) : (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!content.is_draft}
                onChange={handleToggle}
                disabled={isToggling}
                className="sr-only peer"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-600" />
            </label>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <MoreVertical size={14} className="text-gray-600" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32 z-30">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(content.id);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
          {isVideo ? (
            <Video size={12} className="text-purple-600" />
          ) : (
            <ImageIcon size={12} className="text-blue-600" />
          )}
          <span className="text-xs font-medium text-gray-700">{isVideo ? 'Video' : 'Image'}</span>
        </div>
      </div>

      <div className="relative w-full pt-[75%] bg-gray-100">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={content.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isVideo ? (
              <Video size={32} className="text-gray-300" />
            ) : (
              <ImageIcon size={32} className="text-gray-300" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <GripVertical size={32} className="text-white drop-shadow-lg" />
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-bold text-sm text-black mb-1 truncate group-hover:text-gray-700 transition-colors">
          {content.title}
        </h3>

        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {content.type_name}
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {content.format}
          </span>
          {content.platform && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium capitalize">
              {content.platform}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full font-bold ${
              content.is_draft
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-green-100 text-green-800 border border-green-300'
            }`}
          >
            {content.is_draft ? 'DRAFT' : 'PUBLISHED'}
          </span>
        </div>

        <button
          onClick={() => onEdit(content.id)}
          className="w-full mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 text-white bg-black font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200 text-sm"
        >
          <Edit size={14} />
          Edit
        </button>
      </div>
    </article>
  );
}
