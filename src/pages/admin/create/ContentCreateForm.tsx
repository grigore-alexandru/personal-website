import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Save, Trash2, AlertCircle, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { FormInput } from '../../../components/forms/FormInput';
import { FormCheckbox } from '../../../components/forms/FormCheckbox';
import { FormTextarea } from '../../../components/forms/FormTextarea';
import { Button } from '../../../components/forms/Button';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ToastContainer } from '../../../components/ui/Toast';
import { ValidationError as ValidationErrorComponent } from '../../../components/ui/ValidationError';
import { useToast } from '../../../hooks/useToast';
import { slugify } from '../../../utils/slugify';
import { validateSlug } from '../../../utils/validateSlug';
import { supabase } from '../../../lib/supabase';
import {
  createContent,
  updateContent,
  loadContentForEdit,
  loadContentTypes,
  checkContentSlugUniqueness,
  addContentToProject,
  removeContentFromProject,
} from '../../../utils/contentService';
import {
  processAndUploadVideoThumbnail,
  validateVideoFile,
  deleteVideoThumbnails,
} from '../../../utils/contentVideoProcessing';
import {
  processAndUploadContentImage,
  validateContentImage,
  deleteContentImages,
} from '../../../utils/contentImageProcessing';
import { loadProjectTypes } from '../../../utils/portfolioService';
import { ContentType, ProjectType, ContentThumbnailVideo, ContentThumbnailImage, ContentContributor } from '../../../types';

interface ContentFormData {
  type: 'video' | 'image';
  title: string;
  slug: string;
  caption: string;
  url: string;
  platform: 'youtube' | 'vimeo' | 'mega' | 'instagram' | '';
  format: 'landscape' | 'portrait';
  videoFile: File | null;
  videoThumbnail: ContentThumbnailVideo | null;
  imageFile: File | null;
  imageThumbnail: ContentThumbnailImage | null;
  publishedDate: string;
  projectId: string | null;
  hasContributors: boolean;
  contributors: ContentContributor[];
}

interface ValidationError {
  field: string;
  message: string;
}

type FormMode = 'create' | 'edit';

const initialFormData: ContentFormData = {
  type: 'video',
  title: '',
  slug: '',
  caption: '',
  url: '',
  platform: 'youtube',
  format: 'landscape',
  videoFile: null,
  videoThumbnail: null,
  imageFile: null,
  imageThumbnail: null,
  publishedDate: new Date().toISOString().split('T')[0],
  projectId: null,
  hasContributors: false,
  contributors: [],
};

interface ContentCreateFormProps {
  mode?: FormMode;
}

interface ProjectOption {
  id: string;
  title: string;
  typeName: string;
}

export function ContentCreateForm({ mode = 'create' }: ContentCreateFormProps) {
  const navigate = useNavigate();
  const { contentId } = useParams<{ contentId: string }>();
  const { toasts, showToast, closeToast } = useToast();

  const [formData, setFormData] = useState<ContentFormData>({ ...initialFormData });
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [originalProjectId, setOriginalProjectId] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFormDependencies();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && contentId) loadExistingContent(contentId);
  }, [mode, contentId]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (formData.title || formData.slug || formData.url) {
      setHasUnsavedChanges(true);
    }
  }, [formData]);

  const loadFormDependencies = async () => {
    const types = await loadContentTypes();
    setContentTypes(types);

    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, title, type_id, project_type:project_types(name)')
      .order('title');

    if (!error && projects) {
      setProjectOptions(
        projects.map((p: any) => ({
          id: p.id,
          title: p.title,
          typeName: p.project_type?.name || '',
        }))
      );
    }
  };

  const loadExistingContent = async (id: string) => {
    setIsLoadingContent(true);
    const result = await loadContentForEdit(id);
    if (!result.success || !result.data) {
      showToast('error', result.error || 'Failed to load content');
      navigate('/admin/content');
      setIsLoadingContent(false);
      return;
    }

    const c = result.data;
    const isVideo = c.content_type?.slug === 'video';

    const { data: projectLink } = await supabase
      .from('project_content')
      .select('project_id')
      .eq('content_id', id)
      .maybeSingle();

    const linkedProjectId = projectLink?.project_id || null;
    setOriginalProjectId(linkedProjectId);

    setFormData({
      type: isVideo ? 'video' : 'image',
      title: c.title,
      slug: c.slug,
      caption: c.caption || '',
      url: c.url,
      platform: (c.platform || '') as any,
      format: c.format,
      videoFile: null,
      videoThumbnail: isVideo ? (c.thumbnail as ContentThumbnailVideo) : null,
      imageFile: null,
      imageThumbnail: !isVideo ? (c.thumbnail as ContentThumbnailImage) : null,
      publishedDate: c.published_at ? new Date(c.published_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      projectId: linkedProjectId,
      hasContributors: !!c.contributors && c.contributors.length > 0,
      contributors: c.contributors || [],
    });

    setIsLoadingContent(false);
  };

  const handleGenerateSlug = () => {
    if (!formData.title.trim()) {
      showToast('error', 'Please enter a title first');
      return;
    }
    const newSlug = slugify(formData.title);
    setFormData({ ...formData, slug: newSlug });
  };

  const deducePlatformFromUrl = (url: string): typeof formData.platform => {
    if (!url) return '';
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('vimeo.com')) return 'vimeo';
    if (lower.includes('mega.nz')) return 'mega';
    if (lower.includes('instagram.com')) return 'instagram';
    return '';
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      url: value,
      platform: prev.type === 'video' ? deducePlatformFromUrl(value) : '',
    }));
  };

  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      showToast('error', validation.error);
      return;
    }

    setIsUploadingVideo(true);
    setUploadStage('Validating video...');

    try {
      const isPortrait = formData.format === 'portrait';
      const result = await processAndUploadVideoThumbnail(file, isPortrait, (stage) => {
        setUploadStage(stage);
      });

      setFormData((prev) => ({
        ...prev,
        videoFile: file,
        videoThumbnail: result,
      }));
      showToast('success', 'Video thumbnail processed successfully');
    } catch (error) {
      console.error('Video processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing the video';
      showToast('error', errorMessage);
    } finally {
      setIsUploadingVideo(false);
      setUploadStage('');
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateContentImage(file);
    if (!validation.valid) {
      showToast('error', validation.error);
      return;
    }

    setIsUploadingImage(true);
    setUploadStage('Processing image...');

    try {
      const result = await processAndUploadContentImage(file, (stage) => {
        setUploadStage(stage);
      });

      setFormData((prev) => ({
        ...prev,
        imageFile: file,
        imageThumbnail: result,
      }));
      showToast('success', 'Image processed successfully');
    } catch (error) {
      console.error('Image processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing the image';
      showToast('error', errorMessage);
    } finally {
      setIsUploadingImage(false);
      setUploadStage('');
    }
  };

  const handleReplaceVideo = async () => {
    if (formData.videoThumbnail && mode === 'edit') {
      try {
        await deleteVideoThumbnails(formData.videoThumbnail.poster, formData.videoThumbnail.video);
      } catch (error) {
        console.error('Error deleting old video thumbnails:', error);
      }
    }
    setFormData((prev) => ({ ...prev, videoFile: null, videoThumbnail: null }));
    videoInputRef.current?.click();
  };

  const handleReplaceImage = async () => {
    if (formData.imageThumbnail && mode === 'edit') {
      try {
        await deleteContentImages(formData.imageThumbnail.full, formData.imageThumbnail.compressed);
      } catch (error) {
        console.error('Error deleting old images:', error);
      }
    }
    setFormData((prev) => ({ ...prev, imageFile: null, imageThumbnail: null }));
    imageInputRef.current?.click();
  };

  const addContributor = () => {
    setFormData((prev) => ({
      ...prev,
      contributors: [...prev.contributors, { name: '', role: '' }],
    }));
  };

  const removeContributor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contributors: prev.contributors.filter((_, i) => i !== index),
    }));
  };

  const updateContributor = (index: number, field: 'name' | 'role', value: string) => {
    setFormData((prev) => ({
      ...prev,
      contributors: prev.contributors.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const validateForm = async (isPublishing: boolean): Promise<boolean> => {
    const errors: ValidationError[] = [];

    if (!formData.title.trim() || formData.title.length < 3) {
      errors.push({ field: 'title', message: 'Title must be at least 3 characters' });
    }
    if (formData.title.length > 200) {
      errors.push({ field: 'title', message: 'Title must not exceed 200 characters' });
    }

    if (!formData.slug.trim()) {
      errors.push({ field: 'slug', message: 'Slug is required' });
    } else if (!validateSlug(formData.slug)) {
      errors.push({ field: 'slug', message: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    } else {
      const isUnique = await checkContentSlugUniqueness(
        formData.slug,
        mode === 'edit' ? contentId : undefined
      );
      if (!isUnique) {
        errors.push({ field: 'slug', message: 'This slug is already in use' });
      }
    }

    if (isPublishing) {
      if (formData.type === 'video') {
        if (!formData.url.trim()) {
          errors.push({ field: 'url', message: 'Video URL is required' });
        }
        if (!formData.platform) {
          errors.push({ field: 'platform', message: 'Platform is required for videos' });
        }
        if (!formData.videoThumbnail) {
          errors.push({ field: 'video', message: 'Video thumbnail is required' });
        }
      } else {
        if (!formData.imageThumbnail) {
          errors.push({ field: 'image', message: 'Image upload is required' });
        }
      }

      if (formData.hasContributors) {
        formData.contributors.forEach((c, idx) => {
          if (!c.name.trim()) {
            errors.push({ field: `contributor-${idx}`, message: `Contributor ${idx + 1} must have a name` });
          }
        });
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async (isDraft: boolean) => {
    const isValid = await validateForm(!isDraft);
    if (!isValid) {
      showToast('error', 'Please fix the validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      const typeSlug = formData.type;
      const contentType = contentTypes.find((ct) => ct.slug === typeSlug);
      if (!contentType) {
        showToast('error', 'Invalid content type');
        setIsSubmitting(false);
        return;
      }

      const thumbnail =
        formData.type === 'video' ? formData.videoThumbnail : formData.imageThumbnail;

      const contentData = {
        type_id: contentType.id,
        title: formData.title,
        slug: formData.slug,
        caption: formData.caption || null,
        url: formData.url,
        platform: formData.type === 'video' && formData.platform ? formData.platform : null,
        format: formData.format,
        thumbnail: thumbnail || null,
        is_draft: isDraft,
        contributors: formData.hasContributors && formData.contributors.length > 0
          ? formData.contributors.filter((c) => c.name.trim())
          : null,
        published_at: !isDraft ? formData.publishedDate : null,
      };

      let result;
      let savedContentId: string | undefined;

      if (mode === 'edit' && contentId) {
        result = await updateContent(contentId, contentData);
        savedContentId = contentId;
      } else {
        result = await createContent(contentData);
        savedContentId = result.data?.id;
      }

      if (!result.success) {
        showToast('error', result.error || 'Failed to save content');
        setIsSubmitting(false);
        return;
      }

      if (savedContentId && formData.projectId !== originalProjectId) {
        if (originalProjectId) {
          await removeContentFromProject(originalProjectId, savedContentId);
        }
        if (formData.projectId) {
          await addContentToProject(formData.projectId, savedContentId, 0);
        }
      }

      showToast('success', isDraft ? 'Content saved as draft' : 'Content published successfully');
      setHasUnsavedChanges(false);
      navigate('/admin/content');
    } catch (error) {
      console.error('Error saving content:', error);
      showToast('error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      navigate('/admin/content');
    }
  };

  const confirmDiscard = () => {
    setHasUnsavedChanges(false);
    navigate('/admin/content');
  };

  if (isLoadingContent) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  const isVideo = formData.type === 'video';

  return (
    <AdminLayout
      title={mode === 'edit' ? 'Edit Content' : 'Create Content'}
      backLink="/admin/content"
    >
      <div className="max-w-5xl mx-auto">
        {validationErrors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-800 mb-2">Please fix the following errors:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">{error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-8">
          <section>
            <h2 className="text-lg font-bold text-black mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                {mode === 'edit' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
                    {isVideo ? (
                      <>
                        <Video size={18} className="text-purple-600" />
                        <span className="font-medium text-gray-700">Video</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={18} className="text-blue-600" />
                        <span className="font-medium text-gray-700">Image</span>
                      </>
                    )}
                    <span className="text-sm text-gray-500 ml-2">(locked in edit mode)</span>
                  </div>
                ) : (
                  <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'video' })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                        formData.type === 'video'
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Video size={18} />
                      Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'image' })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                        formData.type === 'image'
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <ImageIcon size={18} />
                      Image
                    </button>
                  </div>
                )}
              </div>

              <FormInput
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter content title"
                maxLength={200}
                error={validationErrors.find((e) => e.field === 'title')?.message}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateSlug}
                    disabled={!formData.title.trim()}
                  >
                    <Sparkles size={14} />
                    Generate from Title
                  </Button>
                </div>
                <FormInput
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  required
                  placeholder="content-slug"
                  error={validationErrors.find((e) => e.field === 'slug')?.message}
                />
              </div>

              <FormTextarea
                label="Caption"
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Optional caption for this content"
                rows={3}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Published Date</label>
                <input
                  type="date"
                  value={formData.publishedDate}
                  onChange={(e) => setFormData({ ...formData, publishedDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-4">Project Assignment</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Project</label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">None</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.typeName})
                  </option>
                ))}
              </select>
            </div>
          </section>

          {isVideo ? (
            <section>
              <h2 className="text-lg font-bold text-black mb-4">Video Details</h2>
              <div className="space-y-4">
                <FormInput
                  label="Video URL"
                  value={formData.url}
                  onChange={handleUrlChange}
                  required
                  placeholder="https://youtube.com/watch?v=..."
                  error={validationErrors.find((e) => e.field === 'url')?.message}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">Select platform</option>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="mega">Mega</option>
                    <option value="instagram">Instagram</option>
                  </select>
                  {validationErrors.find((e) => e.field === 'platform') && (
                    <ValidationErrorComponent message={validationErrors.find((e) => e.field === 'platform')!.message} />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'landscape' })}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        formData.format === 'landscape'
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Landscape
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'portrait' })}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        formData.format === 'portrait'
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Portrait
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail Video</label>
                  {!formData.videoThumbnail ? (
                    <div>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={isUploadingVideo}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploadingVideo ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 size={32} className="animate-spin text-gray-400" />
                            <p className="text-sm text-gray-600">{uploadStage}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Video size={32} className="text-gray-400" />
                            <p className="text-sm font-medium text-gray-700">Click to upload video</p>
                            <p className="text-xs text-gray-500">MP4, WebM, or MOV (max 50MB)</p>
                          </div>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Poster Frame</p>
                        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={formData.videoThumbnail.poster}
                            alt="Poster"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Looping Preview</p>
                        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <video
                            src={formData.videoThumbnail.video}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Button
                          variant="secondary"
                          onClick={handleReplaceVideo}
                          disabled={isUploadingVideo}
                        >
                          Replace Video
                        </Button>
                      </div>
                    </div>
                  )}
                  {validationErrors.find((e) => e.field === 'video') && (
                    <ValidationErrorComponent message={validationErrors.find((e) => e.field === 'video')!.message} />
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section>
              <h2 className="text-lg font-bold text-black mb-4">Image Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'landscape' })}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        formData.format === 'landscape'
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Landscape
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'portrait' })}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        formData.format === 'portrait'
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Portrait
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  {!formData.imageThumbnail ? (
                    <div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleImageFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 size={32} className="animate-spin text-gray-400" />
                            <p className="text-sm text-gray-600">{uploadStage}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <ImageIcon size={32} className="text-gray-400" />
                            <p className="text-sm font-medium text-gray-700">Click to upload image</p>
                            <p className="text-xs text-gray-500">JPEG, PNG, or WebP (max 7MB)</p>
                          </div>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.imageThumbnail.full}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <Button
                        variant="secondary"
                        onClick={handleReplaceImage}
                        disabled={isUploadingImage}
                      >
                        Replace Image
                      </Button>
                    </div>
                  )}
                  {validationErrors.find((e) => e.field === 'image') && (
                    <ValidationErrorComponent message={validationErrors.find((e) => e.field === 'image')!.message} />
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black">Contributors</h2>
              <FormCheckbox
                label="Include Contributors"
                checked={formData.hasContributors}
                onChange={(checked) =>
                  setFormData({ ...formData, hasContributors: checked })
                }
              />
            </div>

            {formData.hasContributors && (
              <div className="space-y-3">
                {formData.contributors.map((contributor, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <FormInput
                        value={contributor.name}
                        onChange={(e) => updateContributor(idx, 'name', e.target.value)}
                        placeholder="Name"
                        error={validationErrors.find((e) => e.field === `contributor-${idx}`)?.message}
                      />
                      <FormInput
                        value={contributor.role}
                        onChange={(e) => updateContributor(idx, 'role', e.target.value)}
                        placeholder="Role"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContributor(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <Button variant="secondary" onClick={addContributor}>
                  Add Contributor
                </Button>
              </div>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between gap-4 mt-6">
          <Button variant="danger" onClick={handleDiscard} disabled={isSubmitting}>
            Discard
          </Button>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Draft
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
            >
              {mode === 'edit' ? 'Update' : 'Publish'}
            </Button>
          </div>
        </div>

        {showDiscardDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-black mb-2">Discard Changes?</h3>
              <p className="text-gray-600 mb-6">
                You have unsaved changes. Are you sure you want to discard them?
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowDiscardDialog(false)}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDiscard}>
                  Discard
                </Button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer toasts={toasts} onClose={closeToast} />
      </div>
    </AdminLayout>
  );
}
