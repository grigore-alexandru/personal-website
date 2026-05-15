'use client';

import { useState } from 'react';
import { CreditCard as Edit, MoreVertical, Loader2, Video, Image as ImageIcon, GripVertical, Check, FolderOpen, Unlink } from 'lucide-react';
import { designTokens } from '../../styles/tokens';
import { ProgressiveImage } from '../ui/ProgressiveImage';

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
  projectId?: string | null;
  projectTitle?: string | null;
  onEdit: (contentId: string) => void;
  onToggleStatus: (contentId: string, currentIsDraft: boolean) => Promise<void>;
  onDelete: (contentId: string) => void;
  onDragStart: (e: React.DragEvent, contentId: string) => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
  onCardClick?: (e: React.MouseEvent, contentId: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  isSelected?: boolean;
  isDraggingActive?: boolean;
  dragCount?: number;
  isPivot?: boolean;
  cardRef?: (el: HTMLElement | null) => void;
}

export function AdminContentCard({
  content,
  projectId,
  projectTitle,
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
  cardRef,
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

  const thumbnailUrl = content.thumbnail?.poster ?? null;
  const isVideo = content.type_name?.toLowerCase() === 'video';

  const isGhosted = isDraggingActive && !isDragging && !isDragOver;

  return (
    <article
      ref={cardRef}
      draggable
      onDragStart={(e) => onDragStart(e, content.id)}
      onDragOver={(e) => onDragOver(e, content.id)}
      onDrop={(e) => onDrop(e, content.id)}
      onDragEnd={onDragEnd}
      onClick={(e) => onCardClick?.(e, content.id)}
      className={`relative bg-white border rounded-lg transition-all duration-200 group cursor-move flex flex-col h-full ${
        isDragging ? 'opacity-40 scale-95 shadow-none' : ''
      } ${
        isDragOver
          ? 'border-blue-500 border-2 bg-blue-50 shadow-lg shadow-blue-100'
          : isSelected
          ? 'border-blue-500 border-2 shadow-md shadow-blue-100'
          : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
      } ${isGhosted ? 'opacity-40' : ''}`}
    >
      {isSelected && !isDragging && (
        <div className="absolute top-2 left-2 z-20">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow">
            <Check size={11} className="text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {!isSelected && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-bold">
            #{content.order_index}
          </div>
        </div>
      )}

      {isPivot && dragCount > 1 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="bg-blue-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
            Moving {dragCount}
          </div>
        </div>
      )}

      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <span
          className={`text-xs px-2 py-1 rounded-full font-bold ${
            content.is_draft
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-green-100 text-green-800 border border-green-300'
          }`}
        >
          {content.is_draft ? 'DRAFT' : 'PUBLISHED'}
        </span>

        <div className="bg-white rounded-lg border border-gray-200 px-2 py-1 flex items-center gap-1">
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

      <div className="relative w-full pt-[100%] flex-shrink-0 overflow-hidden rounded-t-lg">
        {thumbnailUrl ? (
          <ProgressiveImage
            src={thumbnailUrl}
            alt={content.title}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            {isVideo ? (
              <Video size={40} className="text-gray-300" />
            ) : (
              <ImageIcon size={40} className="text-gray-300" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <GripVertical size={32} className="text-white drop-shadow-lg" />
        </div>
      </div>

      <div className="flex-1 flex flex-col p-3">
        <div className="flex items-center gap-1.5 mb-2">
          {isVideo ? (
            <Video size={14} className="text-gray-500 flex-shrink-0" />
          ) : (
            <ImageIcon size={14} className="text-gray-500 flex-shrink-0" />
          )}
          <h3
            className="font-bold text-gray-900 truncate"
            style={{
              fontSize: designTokens.typography.sizes.xs,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
            }}
          >
            {content.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
            {content.type_name}
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
            {content.format}
          </span>
          {content.platform && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium capitalize whitespace-nowrap">
              {content.platform}
            </span>
          )}
        </div>

        <div className="mb-2 min-w-0">
          {projectId ? (
            <div className="flex items-center gap-1 px-1.5 py-1 bg-teal-50 border border-teal-200 rounded text-xs text-teal-700 font-medium overflow-hidden">
              <FolderOpen size={11} className="flex-shrink-0" />
              <span className="truncate min-w-0 flex-1">{projectTitle}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 font-medium">
              <Unlink size={11} className="flex-shrink-0" />
              <span className="whitespace-nowrap">Unassigned</span>
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(content.id);
          }}
          className="w-full mt-auto inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-white bg-black font-medium rounded hover:bg-gray-800 transition-colors duration-200 text-xs"
        >
          <Edit size={12} />
          Edit
        </button>
      </div>
    </article>
  );
}
