import { useState } from 'react';
import { Edit, MoreVertical, Loader2 } from 'lucide-react';
import { designTokens } from '../../styles/tokens';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface AdminProjectCardProps {
  project: {
    id: string;
    title: string;
    client_name: string;
    type_name: string;
    hero_image_thumbnail: string;
    is_draft: boolean;
    updated_at: string;
  };
  onEdit: (projectId: string) => void;
  onToggleStatus: (projectId: string, currentIsDraft: boolean) => Promise<void>;
  onDelete: (projectId: string) => void;
}

export function AdminProjectCard({ project, onEdit, onToggleStatus, onDelete }: AdminProjectCardProps) {
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

  return (
    <article className="relative block bg-white border border-gray-100 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200 group">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
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

      <div className="p-6 pt-16">
        <div className="flex flex-col md:flex-row gap-4">
          {project.hero_image_thumbnail && (
            <div className="w-full md:w-2/5 flex-shrink-0">
              <div className="relative w-full pt-[56%] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={project.hero_image_thumbnail}
                  alt={project.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                onClick={() => onEdit(project.id)}
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
    </article>
  );
}
