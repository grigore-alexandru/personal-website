import { ChevronRight } from 'lucide-react';

interface ProjectOption {
  id: string;
  title: string;
  typeName: string;
}

interface BulkProjectSelectorProps {
  projects: ProjectOption[];
  selectedProjectId: string | null;
  itemCount: number;
  onSelect: (id: string | null) => void;
  onConfirm: () => void;
}

export function BulkProjectSelector({
  projects,
  selectedProjectId,
  itemCount,
  onSelect,
  onConfirm,
}: BulkProjectSelectorProps) {
  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-black mb-1">Assign to Project</h2>
        <p className="text-sm text-gray-500">
          Choose a default project for all {itemCount} staged items. You can override per-item in the next step.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center justify-between px-5 py-4 text-left border-b border-gray-100 transition-colors ${
            selectedProjectId === null
              ? 'bg-gray-950 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="font-medium">None / Unassigned</span>
          {selectedProjectId === null && <div className="w-2 h-2 rounded-full bg-white" />}
        </button>

        <div className="max-h-64 overflow-y-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelect(project.id)}
              className={`w-full flex items-center justify-between px-5 py-3.5 text-left border-b border-gray-100 last:border-0 transition-colors ${
                selectedProjectId === project.id
                  ? 'bg-gray-950 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div>
                <p className="font-medium text-sm">{project.title}</p>
                {project.typeName && (
                  <p className={`text-xs mt-0.5 ${selectedProjectId === project.id ? 'text-gray-300' : 'text-gray-400'}`}>
                    {project.typeName}
                  </p>
                )}
              </div>
              {selectedProjectId === project.id && (
                <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onConfirm}
          className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Continue to Review
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
