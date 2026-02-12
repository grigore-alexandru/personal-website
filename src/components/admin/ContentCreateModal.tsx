import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Save, Loader2, AlertCircle, Image as ImageIcon, Video } from 'lucide-react';
import { FormInput } from '../forms/FormInput';
import { FormCheckbox } from '../forms/FormCheckbox';
import { FormTextarea } from '../forms/FormTextarea';
import { Button } from '../forms/Button';
import { Tooltip } from '../ui/Tooltip';
import { ValidationError as ValidationErrorComponent } from '../ui/ValidationError';
import { VideoThumbnailHoverPreview } from './VideoThumbnailHoverPreview';
import { slugify } from '../../utils/slugify';
import { validateSlug } from '../../utils/validateSlug';
import {
  createContent,
  loadContentTypes,
  checkContentSlugUniqueness,
} from '../../utils/contentService';
import {
  processAndUploadVideoThumbnail,
  validateVideoFile,
  deleteVideoThumbnails,
} from '../../utils/contentVideoProcessing';
import {
  processAndUploadContentImage,
  validateContentImage,
  deleteContentImages,
} from '../../utils/contentImageProcessing';
import { ContentType, ContentThumbnailVideo, ContentThumbnailImage, ContentContributor, Content } from '../../types';

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
  hasContributors: boolean;
  contributors: ContentContributor[];
}

interface ValidationError {
  field: string;
  message: string;
}

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
  hasContributors: false,
  contributors: [],
};

interface ContentCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (content: Content) => void;
  onError: (message: string) => void;
}

export function ContentCreateModal({ open, onClose, onSuccess, onError }: ContentCreateModalProps) {
  const [formData, setFormData] = useState<ContentFormData>({ ...initialFormData });
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadStage, setUploadStage] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadTypes();
      setFormData({ ...initialFormData });
      setValidationErrors([]);
    }
  }, [open]);

  const loadTypes = async () => {
    const types = await loadContentTypes();
    setContentTypes(types);
  };

  const deducePlatformFromUrl = (url: string): string => {
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
      onError(validation.error);
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
    } catch (error) {
      console.error('Video processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing the video';
      onError(errorMessage);
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
      onError(validation.error);
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
    } catch (error) {
      console.error('Image processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing the image';
      onError(errorMessage);
    } finally {
      setIsUploadingImage(false);
      setUploadStage('');
    }
  };

  const handleReplaceVideo = async () => {
    if (formData.videoThumbnail) {
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
    if (formData.imageThumbnail) {
      try {
        await deleteContentImages(formData.imageThumbnail.full, formData.imageThumbnail.compressed);
      } catch (error) {
        console.error('Error deleting old image thumbnails:', error);
      }
    }
    setFormData((prev) => ({ ...prev, imageFile: null, imageThumbnail: null }));
    imageInputRef.current?.click();
  };

  const generateSlug = () => {
    if (formData.title.trim()) {
      const newSlug = slugify(formData.title);
      setFormData({ ...formData, slug: newSlug });
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const errors: ValidationError[] = [];

    if (!formData.title.trim()) {
      errors.push({ field: 'title', message: 'Title is required' });
    }

    if (!formData.slug.trim()) {
      errors.push({ field: 'slug', message: 'Slug is required' });
    } else {
      const slugValidation = validateSlug(formData.slug);
      if (!slugValidation.isValid) {
        errors.push({ field: 'slug', message: slugValidation.error });
      } else {
        const isUnique = await checkContentSlugUniqueness(formData.slug);
        if (!isUnique) {
          errors.push({ field: 'slug', message: 'This slug is already in use' });
        }
      }
    }

    if (!formData.url.trim()) {
      errors.push({ field: 'url', message: 'URL is required' });
    }

    if (formData.type === 'video' && !formData.videoThumbnail) {
      errors.push({ field: 'videoThumbnail', message: 'Please upload a thumbnail video' });
    }

    if (formData.type === 'image' && !formData.imageThumbnail) {
      errors.push({ field: 'imageThumbnail', message: 'Please upload a thumbnail image' });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!(await validateForm())) return;

    setIsSubmitting(true);

    const typeSlug = formData.type;
    const contentType = contentTypes.find((ct) => ct.slug === typeSlug);
    if (!contentType) {
      onError('Invalid content type');
      setIsSubmitting(false);
      return;
    }

    const result = await createContent({
      type_id: contentType.id,
      title: formData.title,
      slug: formData.slug,
      url: formData.url,
      platform: formData.type === 'video' && formData.platform ? formData.platform : undefined,
      format: formData.format,
      caption: formData.caption || undefined,
      thumbnail: formData.type === 'video' ? formData.videoThumbnail : formData.imageThumbnail,
      is_draft: false,
      published_at: formData.publishedDate ? new Date(formData.publishedDate).toISOString() : new Date().toISOString(),
      contributors: formData.hasContributors && formData.contributors.length > 0 ? formData.contributors : undefined,
    });

    setIsSubmitting(false);

    if (result.success && result.data) {
      onSuccess(result.data);
      onClose();
    } else {
      onError(result.error || 'Failed to create content');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-black">Create New Content</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
              <div className="flex gap-2">
                {(['video', 'image'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...initialFormData, type: t, platform: t === 'video' ? 'youtube' : '' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      formData.type === t
                        ? 'bg-black text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {t === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
                    {t === 'video' ? 'Video' : 'Image'}
                  </button>
                ))}
              </div>
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
                  variant="ghost"
                  size="sm"
                  onClick={generateSlug}
                  disabled={!formData.title.trim()}
                  icon={<Sparkles size={14} />}
                >
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
              placeholder="Optional caption describing this content"
              rows={3}
            />

            <FormInput
              label={formData.type === 'video' ? 'Embed URL' : 'Image URL'}
              value={formData.url}
              onChange={handleUrlChange}
              required
              placeholder={formData.type === 'video' ? 'https://www.youtube.com/embed/...' : 'https://example.com/image.jpg'}
              error={validationErrors.find((e) => e.field === 'url')?.message}
            />

            {formData.type === 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                >
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="mega">Mega</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <div className="flex gap-2">
                {(['landscape', 'portrait'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormData({ ...formData, format: f })}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                      formData.format === f
                        ? 'bg-black text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {formData.type === 'video' && (
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
                          <p className="text-sm font-medium text-gray-900">Upload Thumbnail Video</p>
                          <p className="text-xs text-gray-500">MP4, WebM, or MOV up to 50MB</p>
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Video Thumbnail (hover to preview)</p>
                      <button
                        type="button"
                        onClick={handleReplaceVideo}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Replace
                      </button>
                    </div>
                    <VideoThumbnailHoverPreview
                      thumbnail={formData.videoThumbnail}
                      className="aspect-video"
                    />
                  </div>
                )}
                {validationErrors.find((e) => e.field === 'videoThumbnail') && (
                  <ValidationErrorComponent message={validationErrors.find((e) => e.field === 'videoThumbnail')!.message} />
                )}
              </div>
            )}

            {formData.type === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail Image</label>
                {!formData.imageThumbnail ? (
                  <div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
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
                          <p className="text-sm font-medium text-gray-900">Upload Thumbnail Image</p>
                          <p className="text-xs text-gray-500">JPEG, PNG, or WebP up to 10MB</p>
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">Image uploaded successfully</p>
                      <button
                        type="button"
                        onClick={handleReplaceImage}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Replace
                      </button>
                    </div>
                    {formData.imageThumbnail.compressed && (
                      <img
                        src={formData.imageThumbnail.compressed}
                        alt="Image thumbnail"
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>
                )}
                {validationErrors.find((e) => e.field === 'imageThumbnail') && (
                  <ValidationErrorComponent message={validationErrors.find((e) => e.field === 'imageThumbnail')!.message} />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-600 hover:text-black border border-neutral-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save size={16} />
                Create Content
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
