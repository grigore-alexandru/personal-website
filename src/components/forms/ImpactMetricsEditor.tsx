import { Plus, X } from 'lucide-react';
import { ImpactMetric } from '../../types';

interface ImpactMetricsEditorProps {
  metrics: ImpactMetric[];
  onChange: (metrics: ImpactMetric[]) => void;
}

const MAX_METRICS = 3;

export function ImpactMetricsEditor({ metrics, onChange }: ImpactMetricsEditorProps) {
  const handleAdd = () => {
    if (metrics.length >= MAX_METRICS) return;
    onChange([...metrics, { label: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(metrics.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof ImpactMetric, value: string) => {
    onChange(metrics.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  return (
    <div className="space-y-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="bg-neutral-50 border border-neutral-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-semibold text-sm mt-2">
              {index + 1}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={metric.label}
                  onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                  placeholder="e.g., Views, Engagement Rate"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={metric.value}
                  onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                  placeholder="e.g., 1.2M, 45%"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="flex-shrink-0 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}

      {metrics.length < MAX_METRICS && (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-black hover:bg-neutral-50 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Metric ({metrics.length}/{MAX_METRICS})
        </button>
      )}

      {metrics.length === 0 && (
        <p className="text-sm text-neutral-400">No impact metrics added yet.</p>
      )}
    </div>
  );
}
