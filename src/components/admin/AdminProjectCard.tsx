import { useState } from 'react';
import { CreditCard as Edit, MoreVertical, Loader2, GripVertical, Check } from 'lucide-react';
import { designTokens } from '../../styles/tokens';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { ProgressiveImage } from '../ui/ProgressiveImage';

interface AdminProjectCardProps {
  project: {
    id: string;
    title: string;
    client_name: string;
    type_name: string;
    hero_image_thumbnail: string;
    is_draft: boolean;
    order_index: number;
    updated_at: string;
  };
  onEdit: (projectId: string) => void;
  onToggleStatus: (projectId: string, currentIsDraft: boolean) => Promise<void>;
  onDelete: (projectId: string) => void;
  onDragStart?: (e: React.DragEvent, projectId: string) => void;
  onDragOver?: (e: React.DragEvent, targetId: string) => void;
  onDrop?: (e: React.DragEvent, targetId: string) => void;
  onDragEnd?: () => void;
  onCardClick?: (e: React.MouseEvent, projectId: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  isSelected?: boolean;
  isDraggingActive?: boolean;
  dragCount?: number;
  isPivot?: boolean;
  dragDisabled?: boolean;
  cardRef?: (el: HTMLElement | null) => void;
}

export function AdminProjectCard({
  project,
  onEdit,
  onToggleStatus,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCardClick,
  isDragging,
  isDragOver,
  isSelected,
  isDraggingActive,
  dragCount = 0,
  isPivot,
  dragDisabled,
  cardRef,
}: AdminProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsToggling(true);
    try {
      await onToggleStatus(project.id, project.is_draft);
    } finally {
      setIsToggling(false);
    }
  };

  const isGhosted = isDraggingActive && !isDragging && !isDragOver;

  const borderClass = isDragOver
    ? 'border-blue-500 border-2 shadow-lg shadow-blue-100'
    : isSelected
    ? 'border-blue-500 border-2 shadow-md shadow-blue-100'
    : 'border-gray-100 hover:shadow-lg hover:border-gray-200';

  return (
    <article
      ref={cardRef}
      draggable={!dragDisabled && !!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, project.id) : undefined}
      onDragOver={onDragOver ? (e) => onDragOver(e, project.id) : undefined}
      onDrop={onDrop ? (e) => onDrop(e, project.id) : undefined}
      onDragEnd={onDragEnd}
      onClick={(e) => onCardClick?.(e, project.id)}
      className={`relative block bg-white border rounded-lg overflow-hidden transition-all duration-200 group ${
        !dragDisabled && onDragStart ? 'cursor-move' : ''
      } ${isDragging ? 'opacity-40 scale-[0.98] shadow-none' : ''} ${
        isGhosted ? 'opacity-40' : ''
      } ${borderClass}`}
    >
      {isDragOver && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-20" />
      )}

      {isPivot && dragCount > 1 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="bg-blue-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
            Moving {dragCount}
          </div>
        </div>
      )}

      <div className="flex items-stretch">
        {!dragDisabled && onDragStart && (
          <div className="flex-shrink-0 flex items-center justify-center w-10 border-r border-gray-100 bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing">
            <GripVertical size={18} className="text-gray-400" />
          </div>
        )}

        <div className="flex-1 p-5 pt-12 md:pt-5">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {isSelected && !isDragging && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow flex-shrink-0">
                <Check size={11} className="text-white" strokeWidth={3} />
              </div>
            )}

            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                project.is_draft
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}
            >
              {project.is_draft ? 'DRAFT' : 'PUBLISHED'}
            </span>

            <div className="relative flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-1">
              {isToggling ? (
                <Loader2 size={16} className="text-gray-400 animate-spin" />
              ) : (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!project.is_draft}
                    onChange={handleToggle}
                    disabled={isToggling}
                    className="sr-only peer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600" />
                </label>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="p-1 rounded hover:bg-gray-50 transition-colors"
              >
                <MoreVertical size={16} className="text-gray-600" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40 z-30">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(project.id); }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {project.hero_image_thumbnail && (
              <div className="w-full md:w-2/5 flex-shrink-0">
                <div className="relative w-full pt-[56%] rounded-lg overflow-hidden">
                  <ProgressiveImage
                    src={project.hero_image_thumbnail}
                    alt={project.title}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div className="mb-4">
                <h2
                  className="text-black font-bold mb-1 group-hover:underline truncate"
                  style={{
                    fontSize: designTokens.typography.sizes.lg,
                    fontFamily: designTokens.typography.fontFamily,
                    fontWeight: designTokens.typography.weights.bold,
                    lineHeight: designTokens.typography.lineHeights.heading,
                  }}
                >
                  {project.title}
                </h2>
                <p className="text-sm text-neutral-600">{project.client_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">
                    {project.type_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    Updated {formatDistanceToNow(project.updated_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(project.id); }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white bg-black font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200"
                  style={{ fontSize: designTokens.typography.sizes.sm, fontFamily: designTokens.typography.fontFamily }}
                >
                  <Edit size={16} />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
