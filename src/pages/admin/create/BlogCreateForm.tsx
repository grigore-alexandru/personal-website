import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { FormInput } from '../../../components/forms/FormInput';
import { FormCheckbox } from '../../../components/forms/FormCheckbox';
import { Button } from '../../../components/forms/Button';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ToastContainer } from '../../../components/ui/Toast';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';
import { SourcesEditor } from '../../../components/forms/SourcesEditor';
import { NotesEditor } from '../../../components/forms/NotesEditor';
import { HeroImageUpload } from '../../../components/forms/HeroImageUpload';
import { BlogPostPreview } from '../../../components/admin/BlogPostPreview';
import { useToast } from '../../../hooks/useToast';
import { slugify } from '../../../utils/slugify';
import { saveDraft, loadDraft, removeDraft } from '../../../utils/draftStorage';
import { validateBlogForm, ValidationError } from '../../../utils/validateBlogForm';
import { saveBlogPost } from '../../../utils/blogService';
import { Source, TipTapContent } from '../../../types';
import { Sparkles, Save, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface BlogFormData {
  title: string;
  slug: string;
  content: TipTapContent;
  heroImageLarge: string | null;
  heroImageThumbnail: string | null;
  hasSources: boolean;
  sources: Source[];
  hasNotes: boolean;
  notesContent: string;
}

const DRAFT_KEY = 'new-blog-post';
const AUTO_SAVE_INTERVAL = 30000;

function generateSourceId(): string {
  return `source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function BlogCreateForm() {
  const navigate = useNavigate();
  const { toasts, showToast, closeToast } = useToast();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    slug: '',
    content: { type: 'doc', content: [] },
    heroImageLarge: null,
    heroImageThumbnail: null,
    hasSources: false,
    sources: [],
    hasNotes: false,
    notesContent: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [savedDraftData, setSavedDraftData] = useState<BlogFormData | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  useEffect(() => {
    const savedDraft = loadDraft<BlogFormData>(DRAFT_KEY);
    if (savedDraft) {
      setSavedDraftData(savedDraft);
      setShowRecoveryDialog(true);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const hasContent =
      formData.title ||
      formData.slug ||
      (formData.content.content && formData.content.content.length > 0) ||
      formData.sources.length > 0 ||
      formData.notesContent;

    if (hasContent) {
      setHasUnsavedChanges(true);
    }
  }, [formData]);

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    if (hasUnsavedChanges) {
      autoSaveTimerRef.current = setInterval(() => {
        saveDraft(DRAFT_KEY, formData);
        setLastAutoSave(new Date());
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [formData, hasUnsavedChanges]);

  const handleRecoverDraft = () => {
    if (savedDraftData) {
      setFormData(savedDraftData);
      showToast('success', 'Draft recovered successfully');
    }
    setShowRecoveryDialog(false);
  };

  const handleDiscardRecovery = () => {
    removeDraft(DRAFT_KEY);
    setShowRecoveryDialog(false);
    showToast('info', 'Starting with a fresh form');
  };

  const handleChange = (field: keyof BlogFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => prev.filter(err => err.field !== field));
  };

  const generateSlug = () => {
    if (formData.title) {
      const newSlug = slugify(formData.title);
      handleChange('slug', newSlug);
      showToast('success', 'Slug generated from title');
    } else {
      showToast('error', 'Please enter a title first');
    }
  };

  const handleToggleSources = (enabled: boolean) => {
    if (enabled && formData.sources.length === 0) {
      handleChange('sources', [{
        id: generateSourceId(),
        title: '',
        url: '',
      }]);
    }
    handleChange('hasSources', enabled);
  };

  const handleHeroImageUpload = (largeUrl: string, thumbnailUrl: string) => {
    handleChange('heroImageLarge', largeUrl);
    handleChange('heroImageThumbnail', thumbnailUrl);
    showToast('success', 'Hero image uploaded successfully');
  };

  const handleHeroImageRemove = () => {
    handleChange('heroImageLarge', null);
    handleChange('heroImageThumbnail', null);
    showToast('info', 'Hero image removed');
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);

    try {
      const result = await saveBlogPost(
        {
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          heroImageLarge: formData.heroImageLarge,
          heroImageThumbnail: formData.heroImageThumbnail,
          hasSources: formData.hasSources,
          sources: formData.sources,
          hasNotes: formData.hasNotes,
          notesContent: formData.notesContent,
        },
        true
      );

      if (result.success) {
        showToast('success', 'Draft saved successfully');
        setHasUnsavedChanges(false);

        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      } else {
        showToast('error', result.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      showToast('error', 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    const validation = await validateBlogForm({
      title: formData.title,
      slug: formData.slug,
      content: formData.content,
      heroImageLarge: formData.heroImageLarge,
      heroImageThumbnail: formData.heroImageThumbnail,
      hasSources: formData.hasSources,
      sources: formData.sources,
      hasNotes: formData.hasNotes,
      notesContent: formData.notesContent,
    }, false);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showToast('error', 'Please fix validation errors before publishing');

      const firstErrorField = validation.errors[0]?.field;
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await saveBlogPost(
        {
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          heroImageLarge: formData.heroImageLarge,
          heroImageThumbnail: formData.heroImageThumbnail,
          hasSources: formData.hasSources,
          sources: formData.sources,
          hasNotes: formData.hasNotes,
          notesContent: formData.notesContent,
        },
        false
      );

      if (result.success) {
        showToast('success', 'Post published successfully');
        setHasUnsavedChanges(false);
        removeDraft(DRAFT_KEY);

        setTimeout(() => {
          if (result.slug) {
            navigate(`/blog/${result.slug}`);
          } else {
            navigate('/admin');
          }
        }, 1500);
      } else {
        showToast('error', result.error || 'Failed to publish post');
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      showToast('error', 'Failed to publish post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setFormData({
      title: '',
      slug: '',
      content: { type: 'doc', content: [] },
      heroImageLarge: null,
      heroImageThumbnail: null,
      hasSources: false,
      sources: [],
      hasNotes: false,
      notesContent: '',
    });
    setValidationErrors([]);
    setHasUnsavedChanges(false);
    removeDraft(DRAFT_KEY);
    setShowDiscardDialog(false);
    showToast('success', 'Changes discarded');
  };

  const editorContent = (
    <div className="space-y-8">
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-2">
                Please fix the following errors:
              </h3>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
        <h1 className="text-3xl font-bold text-black mb-8">Create New Post</h1>

        <div className="space-y-6">
          <div>
            <FormInput
              label="Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter post title"
              required
              error={validationErrors.find(e => e.field === 'title')?.message}
              helperText={`${formData.title.length}/200 characters`}
              maxLength={200}
            />
          </div>

          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-black">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <Tooltip content="The slug is the URL-friendly version of your post title. It should be lowercase, use hyphens instead of spaces, and contain only letters, numbers, and hyphens." />
                </div>
                <FormInput
                  label=""
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="enter-url-slug"
                  required
                  error={validationErrors.find(e => e.field === 'slug')?.message}
                  helperText="Lowercase letters, numbers, and hyphens only"
                />
              </div>
              <Button
                variant="secondary"
                onClick={generateSlug}
                icon={<Sparkles size={16} />}
                className="mb-[52px]"
              >
                Generate
              </Button>
            </div>
          </div>

          <div>
            <HeroImageUpload
              onUploadComplete={handleHeroImageUpload}
              onRemove={handleHeroImageRemove}
              largeUrl={formData.heroImageLarge}
              thumbnailUrl={formData.heroImageThumbnail}
              disabled={isSubmitting}
            />
            {validationErrors.find(e => e.field === 'heroImage') && (
              <p className="text-sm text-red-600 mt-2">
                {validationErrors.find(e => e.field === 'heroImage')?.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
        <div className="mb-6">
          <FormCheckbox
            label="Include Sources"
            checked={formData.hasSources}
            onChange={handleToggleSources}
          />
          <p className="text-sm text-neutral-500 mt-1 ml-6">
            Add a sources section with links to referenced materials
          </p>
        </div>

        {formData.hasSources && (
          <div className="pl-6 border-l-2 border-neutral-200">
            {validationErrors.find(e => e.field === 'sources') && (
              <p className="text-sm text-red-600 mb-4">
                {validationErrors.find(e => e.field === 'sources')?.message}
              </p>
            )}
            <SourcesEditor
              sources={formData.sources}
              onChange={(sources) => handleChange('sources', sources)}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
        <div className="mb-6">
          <FormCheckbox
            label="Include Notes"
            checked={formData.hasNotes}
            onChange={(enabled) => handleChange('hasNotes', enabled)}
          />
          <p className="text-sm text-neutral-500 mt-1 ml-6">
            Add a notes section with additional commentary or context
          </p>
        </div>

        {formData.hasNotes && (
          <div className="pl-6 border-l-2 border-neutral-200">
            {validationErrors.find(e => e.field === 'notes') && (
              <p className="text-sm text-red-600 mb-4">
                {validationErrors.find(e => e.field === 'notes')?.message}
              </p>
            )}
            <NotesEditor
              value={formData.notesContent}
              onChange={(value) => handleChange('notesContent', value)}
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-black mb-6">Content</h2>
        {validationErrors.find(e => e.field === 'content') && (
          <p className="text-sm text-red-600 mb-4">
            {validationErrors.find(e => e.field === 'content')?.message}
          </p>
        )}
        <RichTextEditor
          content={formData.content}
          onChange={(content) => handleChange('content', content)}
          placeholder="Start writing your blog post..."
        />
      </div>
    </div>
  );

  return (
    <AdminLayout currentSection="Create New Post">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant={isPreviewMode ? 'primary' : 'secondary'}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            icon={isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
          >
            {isPreviewMode ? 'Hide Preview' : 'Show Preview'}
          </Button>
          {lastAutoSave && (
            <span className="text-sm text-neutral-500">
              Last auto-saved: {lastAutoSave.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {isPreviewMode ? (
        <div className="grid grid-cols-2 gap-6">
          <div className="max-w-4xl overflow-y-auto max-h-[calc(100vh-200px)]">
            {editorContent}
          </div>
          <div className="sticky top-0 max-h-[calc(100vh-200px)] overflow-y-auto border-l border-neutral-200 pl-6">
            <BlogPostPreview
              title={formData.title}
              content={formData.content}
              hasSources={formData.hasSources}
              sources={formData.sources}
              hasNotes={formData.hasNotes}
              notesContent={formData.notesContent}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {editorContent}
        </div>
      )}

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
            Publish
          </Button>
        </div>
      </div>

      {showRecoveryDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-black mb-2">Recover Unsaved Changes?</h3>
            <p className="text-neutral-600 mb-6">
              We found an unsaved draft from your previous session. Would you like to recover it?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={handleDiscardRecovery}
              >
                Start Fresh
              </Button>
              <Button
                variant="primary"
                onClick={handleRecoverDraft}
              >
                Recover Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDiscardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-black mb-2">Discard Changes?</h3>
            <p className="text-neutral-600 mb-6">
              Are you sure you want to discard all changes? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowDiscardDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDiscard}
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
