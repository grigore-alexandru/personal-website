import { Users, Sparkles } from 'lucide-react';
import { StagingItem } from '../../../types/bulk';
import { FormInput } from '../../forms/FormInput';
import { FormTextarea } from '../../forms/FormTextarea';
import { FormatToggle } from '../../forms/FormatToggle';
import { ProjectSelector, ProjectOption } from '../../forms/ProjectSelector';
import { Button } from '../../forms/Button';
import { slugify } from '../../../utils/slugify';

interface BulkEditFormProps {
  item: StagingItem;
  projects: ProjectOption[];
  selectedCount: number;
  onUpdate: (localId: string, patch: Partial<StagingItem>) => void;
  onApplyToSelected: (patch: Partial<Pick<StagingItem, 'projectId' | 'format' | 'caption' | 'publishedDate'>>) => void;
}

export function BulkEditForm({
  item,
  projects,
  selectedCount,
  onUpdate,
  onApplyToSelected,
}: BulkEditFormProps) {
  const isMulti = selectedCount > 1;
  const isLocked = item.status === 'uploading' || item.status === 'success';

  const handleGenerateSlug = () => {
    if (!item.title.trim()) return;
    onUpdate(item.localId, { slug: slugify(item.title), isModified: true });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(item.localId, { title: e.target.value, isModified: true });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(item.localId, { slug: e.target.value.toLowerCase(), isModified: true });
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(item.localId, { caption: e.target.value, isModified: true });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-l border-gray-100">

      {/* Sticky header */}
      <div className="sticky top-24 z-10 bg-white border-b border-gray-100 px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="text-sm font-bold text-black truncate"
            title={item.title || 'Untitled'}
          >
            {isMulti ? 'Bulk Edit Mode' : (item.title || 'Untitled')}
          </h3>
          {isMulti && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold whitespace-nowrap">
              <Users size={12} />
              {selectedCount} selected
            </span>
          )}
        </div>
        {!isMulti && item.status === 'error' && item.errorMessage && (
          <p className="text-xs text-red-600 mt-1">{item.errorMessage}</p>
        )}
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto p-5 space-y-5">

        {/* Preview thumbnail */}
        {!isMulti && (
          <div
            className={`w-full rounded-lg overflow-hidden bg-gray-100 ${
              item.format === 'portrait' ? 'aspect-[9/16] max-w-[160px] mx-auto' : 'aspect-video'
            }`}
          >
            <img
              src={item.previewUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {isMulti && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
            Editing shared fields for <strong>{selectedCount} items</strong>. Title and Slug are unique per item and cannot be bulk-edited.
          </div>
        )}

        {/* Title — single only */}
        {!isMulti && (
          <FormInput
            label="Title"
            value={item.title}
            onChange={handleTitleChange}
            disabled={isLocked}
            placeholder="Enter title"
            required
          />
        )}

        {/* Slug — single only */}
        {!isMulti && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Slug</label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateSlug}
                disabled={isLocked || !item.title.trim()}
              >
                <Sparkles size={14} />
                Generate from Title
              </Button>
            </div>
            <FormInput
              value={item.slug}
              onChange={handleSlugChange}
              disabled={isLocked}
              placeholder="url-slug"
            />
          </div>
        )}

        {/* Caption — always visible */}
        <div>
          <FormTextarea
            label="Caption"
            value={item.caption}
            onChange={handleCaptionChange}
            disabled={isLocked}
            placeholder="Optional caption"
            rows={3}
          />
          {isMulti && !isLocked && (
            <button
              type="button"
              onClick={() => onApplyToSelected({ caption: item.caption })}
              className="mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Apply caption to all {selectedCount} selected
            </button>
          )}
        </div>

        {/* Format toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
          <FormatToggle
            value={item.format}
            onChange={(v) => onUpdate(item.localId, { format: v })}
            disabled={isLocked}
            size="sm"
          />
          {isMulti && !isLocked && (
            <button
              type="button"
              onClick={() => onApplyToSelected({ format: item.format })}
              className="block mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Apply format to all {selectedCount} selected
            </button>
          )}
        </div>

        {/* Published Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Published Date</label>
          <input
            type="date"
            value={item.publishedDate}
            onChange={(e) => onUpdate(item.localId, { publishedDate: e.target.value })}
            disabled={isLocked}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50 disabled:text-gray-400"
          />
          {isMulti && !isLocked && (
            <button
              type="button"
              onClick={() => onApplyToSelected({ publishedDate: item.publishedDate })}
              className="mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Apply date to all {selectedCount} selected
            </button>
          )}
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
          <ProjectSelector
            value={item.projectId}
            projects={projects}
            onChange={(id) => onUpdate(item.localId, { projectId: id })}
            disabled={isLocked}
          />
          {isMulti && !isLocked && (
            <button
              type="button"
              onClick={() => onApplyToSelected({ projectId: item.projectId })}
              className="mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Apply project to all {selectedCount} selected
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
