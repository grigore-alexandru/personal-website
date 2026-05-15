import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Save, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { FormInput } from '../../../components/forms/FormInput';
import { FormCheckbox } from '../../../components/forms/FormCheckbox';
import { Button } from '../../../components/forms/Button';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ToastContainer } from '../../../components/ui/Toast';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';
import { HeroImageUpload } from '../../../components/forms/HeroImageUpload';
import { ImpactMetricsEditor } from '../../../components/forms/ImpactMetricsEditor';
import { TasksEditor } from '../../../components/forms/TasksEditor';
import { GalleryManager, GalleryItem } from '../../../components/admin/GalleryManager';
import { useToast } from '../../../hooks/useToast';
import { slugify } from '../../../utils/slugify';
import { validateProjectForm, ValidationError } from '../../../utils/validateProjectForm';
import {
  createProject,
  updateProject,
  loadProjectForEdit,
  loadProjectTypes,
} from '../../../utils/portfolioService';
import {
  addContentToProject,
  removeContentFromProject,
  reorderProjectContent,
} from '../../../utils/contentService';
import { TipTapContent, ImpactMetric, Recommendation, ProjectType } from '../../../types';

interface ProjectFormData {
  title: string;
  slug: string;
  type_id: string;
  client_name: string;
  client_logo_url: string;
  heroImageLarge: string;
  heroImageThumbnail: string;
  description: TipTapContent;
  tasks: string[];
  impactMetrics: ImpactMetric[];
  hasRecommendation: boolean;
  recommendation: Recommendation;
  galleryItems: GalleryItem[];
}

type FormMode = 'create' | 'edit';

const emptyRecommendation: Recommendation = {
  name: '',
  role: '',
  text: { type: 'doc', content: [{ type: 'paragraph' }] },
};

const initialFormData: ProjectFormData = {
  title: '',
  slug: '',
  type_id: '',
  client_name: '',
  client_logo_url: '',
  heroImageLarge: '',
  heroImageThumbnail: '',
  description: { type: 'doc', content: [{ type: 'paragraph' }] },
  tasks: [],
  impactMetrics: [],
  hasRecommendation: false,
  recommendation: { ...emptyRecommendation },
  galleryItems: [],
};

interface ProjectCreateFormProps {
  mode?: FormMode;
}

export function ProjectCreateForm({ mode = 'create' }: ProjectCreateFormProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { toasts, showToast, closeToast } = useToast();

  const [formData, setFormData] = useState<ProjectFormData>({ ...initialFormData });
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [originalContentIds, setOriginalContentIds] = useState<string[]>([]);

  useEffect(() => {
    loadFormDependencies();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && projectId) loadExistingProject(projectId);
  }, [mode, projectId]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const loadFormDependencies = async () => {
    const types = await loadProjectTypes();
    setProjectTypes(types);
  };

  const loadExistingProject = async (id: string) => {
    setIsLoadingProject(true);
    const result = await loadProjectForEdit(id);
    if (!result.success || !result.data) {
      showToast('error', result.error || 'Failed to load project');
      navigate('/admin/portfolio');
      setIsLoadingProject(false);
      return;
    }

    const p = result.data;
    const sortedContent = (p.project_content || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((pc: any) => ({
        content_id: pc.content_id,
        content: {
          id: pc.content.id,
          type_id: pc.content.type_id,
          content_type: pc.content.content_type,
          title: pc.content.title,
          caption: pc.content.caption,
          url: pc.content.url,
          platform: pc.content.platform,
          format: pc.content.format,
          thumbnail: pc.content.thumbnail ?? null,
          created_at: pc.content.created_at,
        } as Content,
        order_index: pc.order_index,
      }));

    const rec = p.recommendation as Recommendation | null;
    const metrics = (p.impact_metrics || []) as ImpactMetric[];

    setFormData({
      title: p.title,
      slug: p.slug,
      type_id: p.type_id,
      client_name: p.client_name,
      client_logo_url: p.client_logo_url || '',
      heroImageLarge: p.hero_image_large || '',
      heroImageThumbnail: p.hero_image_thumbnail || '',
      description: p.description || { type: 'doc', content: [{ type: 'paragraph' }] },
      tasks: p.tasks || [],
      impactMetrics: metrics,
      hasRecommendation: !!rec,
      recommendation: rec || { ...emptyRecommendation },
      galleryItems: sortedContent,
    });

    setOriginalContentIds(sortedContent.map((c: GalleryItem) => c.content_id));
    setIsLoadingProject(false);
  };

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => prev.filter((e) => e.field !== field));
    setHasUnsavedChanges(true);
  };

  const generateSlug = () => {
    if (formData.title) {
      handleChange('slug', slugify(formData.title));
      showToast('success', 'Slug generated from title');
    } else {
      showToast('error', 'Please enter a title first');
    }
  };

  const handleHeroUpload = (largeUrl: string, thumbnailUrl: string) => {
    handleChange('heroImageLarge', largeUrl);
    handleChange('heroImageThumbnail', thumbnailUrl);
    showToast('success', 'Hero image uploaded');
  };

  const handleHeroRemove = () => {
    handleChange('heroImageLarge', '');
    handleChange('heroImageThumbnail', '');
  };


  const syncGalleryContent = async (projectId: string) => {
    const currentIds = formData.galleryItems.map((i) => i.content_id);
    const toRemove = originalContentIds.filter((id) => !currentIds.includes(id));
    const toAdd = currentIds.filter((id) => !originalContentIds.includes(id));

    for (const contentId of toRemove) {
      await removeContentFromProject(projectId, contentId);
    }

    for (const contentId of toAdd) {
      const item = formData.galleryItems.find((i) => i.content_id === contentId);
      if (item) await addContentToProject(projectId, contentId, item.order_index);
    }

    await reorderProjectContent(
      projectId,
      formData.galleryItems.map((item, idx) => ({ content_id: item.content_id, order_index: idx }))
    );
  };

  const buildProjectPayload = (isDraft: boolean) => ({
    slug: formData.slug || (isDraft ? `draft-${Date.now()}` : ''),
    type_id: formData.type_id,
    title: formData.title || (isDraft ? 'Untitled Project' : ''),
    client_name: formData.client_name || (isDraft ? 'Unknown' : ''),
    client_logo_url: formData.client_logo_url || null,
    hero_image_large: formData.heroImageLarge,
    hero_image_thumbnail: formData.heroImageThumbnail,
    description: formData.description,
    tasks: formData.tasks.filter((t) => t.trim()),
    impact_metrics: formData.impactMetrics.filter((m) => m.label.trim() || m.value.trim()),
    recommendation: formData.hasRecommendation ? formData.recommendation : null,
    is_draft: isDraft,
  });

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      let result;
      if (mode === 'edit' && projectId) {
        result = await updateProject(projectId, buildProjectPayload(true));
        if (result.success) await syncGalleryContent(projectId);
      } else {
        result = await createProject(buildProjectPayload(true));
        if (result.success && result.projectId) {
          for (let i = 0; i < formData.galleryItems.length; i++) {
            await addContentToProject(result.projectId, formData.galleryItems[i].content_id, i);
          }
        }
      }

      if (result.success) {
        showToast('success', 'Draft saved');
        setHasUnsavedChanges(false);
        setTimeout(() => navigate('/admin/portfolio'), 1500);
      } else {
        showToast('error', result.error || 'Failed to save draft');
      }
    } catch (error) {
      showToast('error', 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    const validation = await validateProjectForm(
      {
        title: formData.title,
        slug: formData.slug,
        type_id: formData.type_id,
        client_name: formData.client_name,
        description: formData.description,
      },
      false,
      mode === 'edit' ? projectId : undefined
    );

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showToast('error', 'Please fix validation errors before publishing');
      const first = validation.errors[0]?.field;
      if (first) {
        document.querySelector(`[name="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      if (mode === 'edit' && projectId) {
        result = await updateProject(projectId, buildProjectPayload(false));
        if (result.success) await syncGalleryContent(projectId);
      } else {
        result = await createProject(buildProjectPayload(false));
        if (result.success && result.projectId) {
          for (let i = 0; i < formData.galleryItems.length; i++) {
            await addContentToProject(result.projectId, formData.galleryItems[i].content_id, i);
          }
        }
      }

      if (result.success) {
        showToast('success', mode === 'edit' ? 'Project updated' : 'Project published');
        setHasUnsavedChanges(false);
        setTimeout(() => {
          if (result.slug) navigate(`/portfolio/project/${result.slug}`);
          else navigate('/admin/portfolio');
        }, 1500);
      } else {
        showToast('error', result.error || 'Failed to publish project');
      }
    } catch (error) {
      showToast('error', 'Failed to publish project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    navigate('/admin/portfolio');
  };

  const getFieldError = (field: string) => validationErrors.find((e) => e.field === field)?.message;
  const sectionTitle = mode === 'edit' ? 'Edit Project' : 'Create New Project';

  if (isLoadingProject) {
    return (
      <AdminLayout currentSection={sectionTitle}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-gray-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentSection={sectionTitle}>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="max-w-4xl mx-auto space-y-8">
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Please fix the following errors:</h3>
                <ul className="space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i} className="text-sm text-red-700">{error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h1 className="text-3xl font-bold text-black mb-8">{sectionTitle}</h1>

          <div className="space-y-6">
            <FormInput
              label="Title"
              name="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter project title"
              required
              error={getFieldError('title')}
              maxLength={200}
            />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-black">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <Tooltip content="URL-friendly identifier. Lowercase, hyphens, no spaces." />
                </div>
                <FormInput
                  label=""
                  name="slug"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="project-url-slug"
                  required
                  error={getFieldError('slug')}
                  helperText="Lowercase letters, numbers, and hyphens only"
                />
              </div>
              <Button variant="secondary" onClick={generateSlug} icon={<Sparkles size={16} />} className="mb-[52px]">
                Generate
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Project Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type_id"
                value={formData.type_id}
                onChange={(e) => handleChange('type_id', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
                  getFieldError('type_id') ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 focus:ring-black focus:border-transparent'
                }`}
              >
                <option value="">Select a type...</option>
                {projectTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
              {getFieldError('type_id') && <p className="mt-2 text-sm text-red-600">{getFieldError('type_id')}</p>}
            </div>

            <FormInput
              label="Client Name"
              name="client_name"
              value={formData.client_name}
              onChange={(e) => handleChange('client_name', e.target.value)}
              placeholder="Enter client name"
              required
              error={getFieldError('client_name')}
            />

            <FormInput
              label="Client Logo URL"
              value={formData.client_logo_url}
              onChange={(e) => handleChange('client_logo_url', e.target.value)}
              placeholder="https://example.com/logo.svg (optional)"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h2 className="text-xl font-bold text-black mb-6">Hero Image</h2>
          <HeroImageUpload
            onUploadComplete={handleHeroUpload}
            onRemove={handleHeroRemove}
            largeUrl={formData.heroImageLarge || null}
            thumbnailUrl={formData.heroImageThumbnail || null}
            disabled={isSubmitting}
            bucket="portfolio-images"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h2 className="text-xl font-bold text-black mb-6">Description</h2>
          {getFieldError('description') && (
            <p className="text-sm text-red-600 mb-4">{getFieldError('description')}</p>
          )}
          <RichTextEditor
            content={formData.description}
            onChange={(content) => handleChange('description', content)}
            placeholder="Describe the project..."
          />
          <style>{`.ProseMirror { min-height: 200px !important; }`}</style>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h2 className="text-xl font-bold text-black mb-6">Impact Metrics</h2>
          <p className="text-sm text-neutral-500 mb-4">Add up to 3 key metrics that showcase the project's impact.</p>
          <ImpactMetricsEditor
            metrics={formData.impactMetrics}
            onChange={(metrics) => handleChange('impactMetrics', metrics)}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h2 className="text-xl font-bold text-black mb-6">Gallery Content</h2>
          <p className="text-sm text-neutral-500 mb-4">Add videos and images to the project gallery. Browse existing content or add new items.</p>
          <GalleryManager
            items={formData.galleryItems}
            onChange={(items) => handleChange('galleryItems', items)}
            onSuccess={(message) => showToast('success', message)}
            onError={(message) => showToast('error', message)}
            contentSource="portfolio"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h2 className="text-xl font-bold text-black mb-6">Tasks / Deliverables</h2>
          <p className="text-sm text-neutral-500 mb-4">List the key tasks and deliverables for this project.</p>
          <TasksEditor
            tasks={formData.tasks}
            onChange={(tasks) => handleChange('tasks', tasks)}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <div className="mb-6">
            <FormCheckbox
              label="Include Recommendation / Testimonial"
              checked={formData.hasRecommendation}
              onChange={(enabled: any) => handleChange('hasRecommendation', enabled)}
            />
            <p className="text-sm text-neutral-500 mt-1 ml-6">Add a client testimonial or recommendation.</p>
          </div>

          {formData.hasRecommendation && (
            <div className="pl-6 border-l-2 border-neutral-200 space-y-4">
              <FormInput
                label="Name"
                value={formData.recommendation.name}
                onChange={(e) =>
                  handleChange('recommendation', { ...formData.recommendation, name: e.target.value })
                }
                placeholder="Recommender's name"
              />
              <FormInput
                label="Role"
                value={formData.recommendation.role}
                onChange={(e) =>
                  handleChange('recommendation', { ...formData.recommendation, role: e.target.value })
                }
                placeholder="e.g., CEO, Marketing Director"
              />
              <div>
                <label className="block text-sm font-medium text-black mb-2">Testimonial Text</label>
                <RichTextEditor
                  content={formData.recommendation.text}
                  onChange={(content) =>
                    handleChange('recommendation', { ...formData.recommendation, text: content })
                  }
                  placeholder="Write the testimonial..."
                />
                <style>{`.ProseMirror { min-height: 120px !important; }`}</style>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 mt-8 bg-white border-t border-neutral-200 py-4 px-8 flex items-center justify-between gap-4 shadow-lg">
        <Button
          variant="danger"
          onClick={() => setShowDiscardDialog(true)}
          icon={<Trash2 size={16} />}
          disabled={isSubmitting || !hasUnsavedChanges}
        >
          Discard
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            icon={<Save size={16} />}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            onClick={handlePublish}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {mode === 'edit' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {showDiscardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-black mb-2">Discard Changes?</h3>
            <p className="text-neutral-600 mb-6">
              {mode === 'edit'
                ? 'Are you sure? Your original project will remain unchanged.'
                : 'Are you sure? No project will be created.'}
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDiscardDialog(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDiscard}>Discard</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
