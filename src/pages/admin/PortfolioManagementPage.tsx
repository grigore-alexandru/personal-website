import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { SearchBar } from '../../components/ui/SearchBar';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminProjectCard } from '../../components/admin/AdminProjectCard';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import { ProjectType } from '../../types';
import { loadProjectTypes, toggleProjectDraft, deleteProject } from '../../utils/portfolioService';

interface ProjectListItem {
  id: string;
  title: string;
  slug: string;
  client_name: string;
  type_id: string;
  type_name: string;
  hero_image_thumbnail: string;
  is_draft: boolean;
  updated_at: string;
}

type FilterType = 'all' | 'published' | 'drafts';

export function PortfolioManagementPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toasts, showToast, closeToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const types = await loadProjectTypes();
    setProjectTypes(types);

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, slug, client_name, type_id, hero_image_thumbnail, is_draft, updated_at, project_type:project_types(name)')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      showToast('error', 'Failed to load projects');
    } else {
      setProjects(
        (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          client_name: p.client_name,
          type_id: p.type_id,
          type_name: p.project_type?.name || '',
          hero_image_thumbnail: p.hero_image_thumbnail,
          is_draft: p.is_draft,
          updated_at: p.updated_at,
        }))
      );
    }
    setLoading(false);
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (activeFilter === 'published') return !p.is_draft;
        if (activeFilter === 'drafts') return p.is_draft;
        return true;
      })
      .filter((p) => {
        if (typeFilter !== 'all') return p.type_id === typeFilter;
        return true;
      })
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q);
      });
  }, [projects, activeFilter, typeFilter, searchQuery]);

  const handleEdit = (projectId: string) => {
    navigate(`/admin/portfolio/project/edit/${projectId}`);
  };

  const handleToggleStatus = async (projectId: string, currentIsDraft: boolean): Promise<void> => {
    const result = await toggleProjectDraft(projectId, !currentIsDraft);
    if (result.success) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, is_draft: !currentIsDraft } : p))
      );
      showToast('success', currentIsDraft ? 'Project published' : 'Project unpublished');
    } else {
      showToast('error', result.error || 'Failed to update project status');
    }
  };

  const handleDelete = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);

    const result = await deleteProject(projectToDelete);
    if (result.success) {
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete));
      showToast('success', 'Project deleted');
    } else {
      showToast('error', result.error || 'Failed to delete project');
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setProjectToDelete(null);
  };

  const publishedCount = projects.filter((p) => !p.is_draft).length;
  const draftsCount = projects.filter((p) => p.is_draft).length;

  return (
    <AdminLayout currentSection="Portfolio Management">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-black mb-2">Projects</h2>
          <p className="text-gray-600">Manage your portfolio projects</p>
        </div>
        <button
          onClick={() => navigate('/admin/portfolio/project/create')}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'all' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-black'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setActiveFilter('published')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'published' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-black'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setActiveFilter('drafts')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === 'drafts' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-black'
            }`}
          >
            Drafts ({draftsCount})
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search projects..."
            size="sm"
            className="flex-1 max-w-xs"
          />

          {projectTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Types</option>
              {projectTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-gray-400 animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">
            {searchQuery || typeFilter !== 'all'
              ? 'No matching projects found'
              : activeFilter === 'all'
              ? 'No projects yet'
              : activeFilter === 'published'
              ? 'No published projects'
              : 'No draft projects'}
          </p>
          {!searchQuery && typeFilter === 'all' && activeFilter === 'all' && (
            <button
              onClick={() => navigate('/admin/portfolio/project/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={20} />
              <span>Create Your First Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredProjects.map((project) => (
            <AdminProjectCard
              key={project.id}
              project={project}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-2">Delete Project</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModalOpen(false); setProjectToDelete(null); }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
