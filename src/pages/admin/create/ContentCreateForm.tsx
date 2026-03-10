import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Save, Trash2, AlertCircle, Loader2, Image as ImageIcon, Video, UploadCloud } from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { FormInput } from '../../../components/forms/FormInput';
import { FormCheckbox } from '../../../components/forms/FormCheckbox';
import { FormTextarea } from '../../../components/forms/FormTextarea';
import { Button } from '../../../components/forms/Button';
import { ToastContainer } from '../../../components/ui/Toast';
import { ValidationError as ValidationErrorComponent } from '../../../components/ui/ValidationError';
import { VideoThumbnailHoverPreview } from '../../../components/admin/VideoThumbnailHoverPreview';
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
  processAndUploadContentPoster,
  validateContentImage,
  deleteContentImages,
} from '../../../utils/contentImageProcessing';
import { uploadContentMainImage } from '../../../utils/imageUpload';
import { ContentType, isVideoThumbnail, ContentThumbnailVideo, ContentThumbnailImage, ContentContributor } from '../../../types';

const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface VideoThumbnailState {
  kind: 'video';
  data: ContentThumbnailVideo;
}

interface ImageThumbnailState {
  kind: 'image';
  data: ContentThumbnailImage;
}

type ThumbnailState = VideoThumbnailState | ImageThumbnailState | null;

interface ContentFormData {
  type: 'video' | 'image';
  title: string;
  slug: string;
  caption: string;
  url: string;
  platform: 'youtube' | 'vimeo' | 'mega' | 'instagram' | '';
  format: 'landscape' | 'portrait';
  thumbnail: ThumbnailState;
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
  thumbnail: null,
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
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isUploadingMainImage, setIsUploadingMainImage] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [originalProjectId, setOriginalProjectId] = useState<string | null>(null);

  const thumbnailInputRef  = useRef<HTMLInputElement>(null);
  const mainImageInputRef  = useRef<HTMLInputElement>(null);

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

    let thumbnail: ThumbnailState = null;
    if (c.thumbnail) {
      if (isVideoThumbnail(c.thumbnail)) {
        thumbnail = { kind: 'video', data: c.thumbnail as ContentThumbnailVideo };
      } else {
        thumbnail = { kind: 'image', data: c.thumbnail as ContentThumbnailImage };
      }
    }

    setFormData({
      type: isVideo ? 'video' : 'image',
      title: c.title,
      slug: c.slug,
      caption: c.caption || '',
      url: c.url,
      platform: (c.platform || '') as any,
      format: c.format,
      thumbnail,
      publishedDate: c.published_at
        ? new Date(c.published_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
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
    setFormData({ ...formData, slug: slugify(formData.title) });
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

  const clearExistingThumbnail = async (current: ThumbnailState) => {
    if (!current || mode !== 'edit') return;
    try {
      if (current.kind === 'video') {
        await deleteVideoThumbnails(current.data.poster, current.data.hover_video);
      } else {
        await deleteContentImages(current.data.poster);
      }
    } catch (error) {
      console.error('Error deleting old thumbnail:', error);
    }
  };

  const handleThumbnailFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideoFile = ALLOWED_VIDEO_MIME.includes(file.type);
    const isImageFile = ALLOWED_IMAGE_MIME.includes(file.type);

    if (!isVideoFile && !isImageFile) {
      showToast('error', 'Invalid file type. Upload an image (JPEG, PNG, WebP) or video (MP4, WebM, MOV).');
      return;
    }

    await clearExistingThumbnail(formData.thumbnail);
    setFormData((prev) => ({ ...prev, thumbnail: null }));
    setIsUploadingThumbnail(true);

    try {
      if (isVideoFile) {
        const validation = validateVideoFile(file);
        if (!validation.valid) {
          showToast('error', validation.error);
          return;
        }
        setUploadStage('Validating video...');
        const result = await processAndUploadVideoThumbnail(
          file,
          formData.format === 'portrait',
          (stage) => setUploadStage(stage)
        );
        setFormData((prev) => ({ ...prev, thumbnail: { kind: 'video', data: result } }));
        showToast('success', 'Video thumbnail processed');
      } else {
        const validation = validateContentImage(file);
        if (!validation.valid) {
          showToast('error', validation.error);
          return;
        }
        setUploadStage('Processing image...');
        const result = await processAndUploadContentPoster(
          file,
          formData.format === 'portrait',
          (stage) => setUploadStage(stage)
        );
        setFormData((prev) => ({ ...prev, thumbnail: { kind: 'image', data: result } }));
        showToast('success', 'Thumbnail image uploaded');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to process file';
      showToast('error', msg);
    } finally {
      setIsUploadingThumbnail(false);
      setUploadStage('');
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const handleReplaceThumbnail = async () => {
    await clearExistingThumbnail(formData.thumbnail);
    setFormData((prev) => ({ ...prev, thumbnail: null }));
    thumbnailInputRef.current?.click();
  };

  const handleMainImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
      showToast('error', 'Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    setIsUploadingMainImage(true);
    setUploadStage('Processing main image...');

    try {
      const [mainResult, thumbResult] = await Promise.all([
        uploadContentMainImage(file, (stage) => setUploadStage(`Main: ${stage}`)),
        processAndUploadContentPoster(file, formData.format === 'portrait', (stage) =>
          setUploadStage(`Thumbnail: ${stage}`)
        ),
      ]);

      setFormData((prev) => ({
        ...prev,
        url: mainResult.publicUrl,
        thumbnail: { kind: 'image', data: thumbResult },
      }));
      showToast('success', 'Image uploaded and thumbnail generated');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload image';
      showToast('error', msg);
    } finally {
      setIsUploadingMainImage(false);
      setUploadStage('');
      if (mainImageInputRef.current) mainImageInputRef.current.value = '';
    }
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
        if (!formData.thumbnail) {
          errors.push({ field: 'thumbnail', message: 'A thumbnail (image or video clip) is required' });
        }
      } else {
        if (!formData.url.trim()) {
          errors.push({ field: 'url', message: 'Main image is required' });
        }
        if (!formData.thumbnail) {
          errors.push({ field: 'thumbnail', message: 'A thumbnail image is required' });
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

  const buildThumbnailPayload = (): ContentThumbnailVideo | ContentThumbnailImage | null => {
    if (!formData.thumbnail) return null;
    if (formData.thumbnail.kind === 'video') return formData.thumbnail.data;
    return formData.thumbnail.data;
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

      const contentData = {
        type_id: contentType.id,
        title: formData.title,
        slug: formData.slug,
        caption: formData.caption || null,
        url: formData.url,
        platform: formData.type === 'video' && formData.platform ? formData.platform : null,
        format: formData.format,
        thumbnail: buildThumbnailPayload(),
        is_draft: isDraft,
        contributors:
          formData.hasContributors && formData.contributors.length > 0
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
  const posterUrl = formData.thumbnail?.data.poster ?? null;

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

          {/* Basic Information */}
          <section>
            <h2 className="text-lg font-bold text-black mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                {mode === 'edit' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
                    {isVideo ? (
                      <>
                        <Video size={18} className="text-gray-600" />
                        <span className="font-medium text-gray-700">Video</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={18} className="text-gray-600" />
                        <span className="font-medium text-gray-700">Image</span>
                      </>
                    )}
                    <span className="text-sm text-gray-500 ml-2">(locked in edit mode)</span>
                  </div>
                ) : (
                  <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'video', thumbnail: null })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                        formData.type === 'video' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Video size={18} />
                      Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'image', thumbnail: null, url: '', platform: '' })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                        formData.type === 'image' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
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

          {/* Project Assignment */}
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

          {/* Video Details */}
          {isVideo && (
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
                    <ValidationErrorComponent
                      message={validationErrors.find((e) => e.field === 'platform')!.message}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <FormatToggle
                    value={formData.format}
                    onChange={(v) => setFormData({ ...formData, format: v })}
                  />
                </div>

                {/* Unified thumbnail upload for video type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Upload an image for a static thumbnail, or a short video clip for an animated hover preview.
                  </p>
                  <ThumbnailUploadZone
                    thumbnail={formData.thumbnail}
                    posterUrl={posterUrl}
                    isUploading={isUploadingThumbnail}
                    uploadStage={uploadStage}
                    inputRef={thumbnailInputRef}
                    accept={[...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME].join(',')}
                    onFileSelect={handleThumbnailFileSelect}
                    onReplace={handleReplaceThumbnail}
                    hint="Image (JPEG, PNG, WebP) or Video clip (MP4, WebM, MOV)"
                  />
                  {validationErrors.find((e) => e.field === 'thumbnail') && (
                    <ValidationErrorComponent
                      message={validationErrors.find((e) => e.field === 'thumbnail')!.message}
                    />
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Image Details */}
          {!isVideo && (
            <section>
              <h2 className="text-lg font-bold text-black mb-4">Image Details</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <FormatToggle
                    value={formData.format}
                    onChange={(v) => setFormData({ ...formData, format: v })}
                  />
                </div>

                {/* Single upload — generates both full URL and thumbnail automatically */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Upload one image. A high-res version is saved as the main URL and a compressed thumbnail is auto-generated for the grid.
                  </p>
                  {!formData.url ? (
                    <div>
                      <input
                        ref={mainImageInputRef}
                        type="file"
                        accept={ALLOWED_IMAGE_MIME.join(',')}
                        onChange={handleMainImageFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => mainImageInputRef.current?.click()}
                        disabled={isUploadingMainImage}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploadingMainImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 size={32} className="animate-spin text-gray-400" />
                            <p className="text-sm text-gray-600">{uploadStage}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <UploadCloud size={32} className="text-gray-400" />
                            <p className="text-sm font-medium text-gray-700">Click to upload image</p>
                            <p className="text-xs text-gray-500">JPEG, PNG, or WebP — thumbnail auto-generated</p>
                          </div>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Full image</p>
                          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            <img src={formData.url} alt="Main image" className="w-full h-full object-contain" />
                          </div>
                        </div>
                        {posterUrl && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Grid thumbnail (auto)</p>
                            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                              <img src={posterUrl} alt="Thumbnail" className="w-full h-full object-contain" />
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, url: '', thumbnail: null }));
                          setTimeout(() => mainImageInputRef.current?.click(), 0);
                        }}
                        disabled={isUploadingMainImage}
                      >
                        Replace Image
                      </Button>
                    </div>
                  )}
                  {validationErrors.find((e) => e.field === 'url') && (
                    <ValidationErrorComponent
                      message={validationErrors.find((e) => e.field === 'url')!.message}
                    />
                  )}
                  {validationErrors.find((e) => e.field === 'thumbnail') && (
                    <ValidationErrorComponent
                      message={validationErrors.find((e) => e.field === 'thumbnail')!.message}
                    />
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Contributors */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black">Contributors</h2>
              <FormCheckbox
                label="Include Contributors"
                checked={formData.hasContributors}
                onChange={(checked) => setFormData({ ...formData, hasContributors: checked })}
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

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between gap-4 mt-6">
          <Button variant="danger" onClick={handleDiscard} disabled={isSubmitting}>
            Discard
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => handleSave(true)} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Draft
            </Button>
            <Button variant="primary" onClick={() => handleSave(false)} disabled={isSubmitting}>
              {mode === 'edit' ? 'Update' : 'Publish'}
            </Button>
          </div>
        </div>

        {/* Discard dialog */}
        {showDiscardDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-black mb-2">Discard Changes?</h3>
              <p className="text-gray-600 mb-6">
                You have unsaved changes. Are you sure you want to discard them?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowDiscardDialog(false)}>
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

// ── Sub-components ──────────────────────────────────────────────────────────

interface FormatToggleProps {
  value: 'landscape' | 'portrait';
  onChange: (v: 'landscape' | 'portrait') => void;
}

function FormatToggle({ value, onChange }: FormatToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
      {(['landscape', 'portrait'] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
            value === opt ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

interface ThumbnailUploadZoneProps {
  thumbnail: ThumbnailState;
  posterUrl: string | null;
  isUploading: boolean;
  uploadStage: string;
  inputRef: React.RefObject<HTMLInputElement>;
  accept: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReplace: () => void;
  hint: string;
}

function ThumbnailUploadZone({
  thumbnail,
  posterUrl,
  isUploading,
  uploadStage,
  inputRef,
  accept,
  onFileSelect,
  onReplace,
  hint,
}: ThumbnailUploadZoneProps) {
  if (!thumbnail) {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={32} className="animate-spin text-gray-400" />
              <p className="text-sm text-gray-600">{uploadStage}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud size={32} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Click to upload thumbnail</p>
              <p className="text-xs text-gray-500">{hint}</p>
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {thumbnail.kind === 'video' ? (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">
            Video thumbnail — hover to preview clip
          </p>
          <VideoThumbnailHoverPreview
            thumbnail={thumbnail.data}
            className="aspect-video"
          />
        </div>
      ) : (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Poster image</p>
          {posterUrl && (
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img src={posterUrl} alt="Thumbnail preview" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onFileSelect}
        className="hidden"
      />
      <Button variant="secondary" onClick={onReplace} disabled={isUploading}>
        Replace Thumbnail
      </Button>
    </div>
  );
}
