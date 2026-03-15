import { Users } from 'lucide-react';
import { StagingItem } from '../../../types/bulk';

interface ProjectOption {
  id: string;
  title: string;
  typeName: string;
}

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

  const inputCls = `w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50 disabled:text-gray-400`;

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-white border-l border-gray-100">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-black truncate max-w-[200px]" title={item.title}>
            {item.title || 'Untitled'}
          </h3>
          {isMulti && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <Users size={12} />
              {selectedCount} selected
            </span>
          )}
        </div>
        {item.status === 'error' && item.errorMessage && (
          <p className="text-xs text-red-600 mt-1">{item.errorMessage}</p>
        )}
      </div>

      <div className="p-5 space-y-5">
        <div
          className={`w-full rounded-lg overflow-hidden bg-gray-100 ${
            item.format === 'portrait' ? 'aspect-[9/16] max-w-[180px] mx-auto' : 'aspect-video'
          }`}
        >
          <img src={item.previewUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>

        {field(
          'Title',
          <input
            type="text"
            value={item.title}
            onChange={(e) => onUpdate(item.localId, { title: e.target.value })}
            disabled={isLocked}
            className={inputCls}
            placeholder="Enter title"
          />
        )}

        {field(
          'Slug',
          <input
            type="text"
            value={item.slug}
            onChange={(e) => onUpdate(item.localId, { slug: e.target.value.toLowerCase() })}
            disabled={isLocked}
            className={inputCls}
            placeholder="url-slug"
          />
        )}

        {field(
          'Caption',
          <textarea
            value={item.caption}
            onChange={(e) => onUpdate(item.localId, { caption: e.target.value })}
            disabled={isLocked}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="Optional caption"
          />
        )}

        {field(
          'Format',
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
            {(['landscape', 'portrait'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isLocked}
                onClick={() => onUpdate(item.localId, { format: opt })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors disabled:opacity-40 ${
                  item.format === opt ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {field(
          'Published Date',
          <input
            type="date"
            value={item.publishedDate}
            onChange={(e) => onUpdate(item.localId, { publishedDate: e.target.value })}
            disabled={isLocked}
            className={inputCls}
          />
        )}

        {field(
          'Project',
          <select
            value={item.projectId ?? ''}
            onChange={(e) => onUpdate(item.localId, { projectId: e.target.value || null })}
            disabled={isLocked}
            className={inputCls}
          >
            <option value="">None / Unassigned</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.typeName})
              </option>
            ))}
          </select>
        )}

        {isMulti && !isLocked && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3">
              Apply fields from this item to all {selectedCount} selected items:
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { label: 'Format', key: 'format' as const, value: item.format },
                  { label: 'Project', key: 'projectId' as const, value: item.projectId },
                  { label: 'Caption', key: 'caption' as const, value: item.caption },
                  { label: 'Date', key: 'publishedDate' as const, value: item.publishedDate },
                ] as const
              ).map(({ label, key, value }) => (
                <button
                  key={key}
                  onClick={() => onApplyToSelected({ [key]: value } as any)}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Apply {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
