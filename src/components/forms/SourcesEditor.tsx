import { Source } from '../../types';
import { Plus, X } from 'lucide-react';

interface SourcesEditorProps {
  sources: Source[];
  onChange: (sources: Source[]) => void;
}

function generateId(): string {
  return `source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function SourcesEditor({ sources, onChange }: SourcesEditorProps) {
  const handleAddSource = () => {
    const newSource: Source = {
      id: generateId(),
      title: '',
      url: '',
    };
    onChange([...sources, newSource]);
  };

  const handleRemoveSource = (id: string) => {
    if (sources.length === 1) return;
    onChange(sources.filter(source => source.id !== id));
  };

  const handleUpdateSource = (id: string, field: keyof Omit<Source, 'id'>, value: string) => {
    onChange(
      sources.map(source =>
        source.id === id ? { ...source, [field]: value } : source
      )
    );
  };

  const isValidUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {sources.map((source, index) => (
          <div
            key={source.id}
            className="bg-neutral-50 border border-neutral-200 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-semibold text-sm mt-2">
                {index + 1}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Source Title
                  </label>
                  <input
                    type="text"
                    value={source.title}
                    onChange={(e) => handleUpdateSource(source.id, 'title', e.target.value)}
                    placeholder="e.g., Article Name, Research Paper"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Source URL
                  </label>
                  <input
                    type="url"
                    value={source.url}
                    onChange={(e) => handleUpdateSource(source.id, 'url', e.target.value)}
                    placeholder="https://example.com/article"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                      source.url && !isValidUrl(source.url)
                        ? 'border-red-300 bg-red-50'
                        : 'border-neutral-300'
                    }`}
                  />
                  {source.url && !isValidUrl(source.url) && (
                    <p className="text-xs text-red-600 mt-1">Please enter a valid URL</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSource(source.id)}
                disabled={sources.length === 1}
                className="flex-shrink-0 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors mt-2"
                title="Remove source"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddSource}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-black hover:bg-neutral-50 rounded-lg transition-colors"
      >
        <Plus size={16} />
        Add Source
      </button>
    </div>
  );
}
