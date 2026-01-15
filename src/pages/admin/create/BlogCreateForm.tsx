import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { FormInput } from '../../../components/forms/FormInput';
import { Button } from '../../../components/forms/Button';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ValidationError } from '../../../components/ui/ValidationError';
import { ToastContainer } from '../../../components/ui/Toast';
import { useToast } from '../../../hooks/useToast';
import { slugify } from '../../../utils/slugify';
import { validateSlug } from '../../../utils/validateSlug';
import { checkSlugUniqueness } from '../../../utils/checkSlugUniqueness';
import { saveDraft, loadDraft, removeDraft } from '../../../utils/draftStorage';
import { getCurrentDateTime } from '../../../utils/dateUtils';
import { supabase } from '../../../lib/supabase';
import { Sparkles, Save, Trash2, Eye } from 'lucide-react';

interface BlogFormData {
  title: string;
  slug: string;
  hero_image_url: string;
}

const DRAFT_KEY = 'new-blog-post';

export function BlogCreateForm() {
  const navigate = useNavigate();
  const { toasts, showToast, closeToast } = useToast();

  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    slug: '',
    hero_image_url: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BlogFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  useEffect(() => {
    const savedDraft = loadDraft<BlogFormData>(DRAFT_KEY);
    if (savedDraft) {
      setFormData(savedDraft);
      showToast('success', 'Draft loaded from previous session');
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
    if (formData.title || formData.slug || formData.hero_image_url) {
      setHasUnsavedChanges(true);
      saveDraft(DRAFT_KEY, formData);
    }
  }, [formData]);

  const handleChange = (field: keyof BlogFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
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

  const validateSlugField = async () => {
    const validation = validateSlug(formData.slug);

    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, slug: validation.error }));
      return false;
    }

    const isUnique = await checkSlugUniqueness(formData.slug);
    if (!isUnique) {
      setErrors(prev => ({ ...prev, slug: 'This slug is already in use' }));
      return false;
    }

    setErrors(prev => ({ ...prev, slug: undefined }));
    return true;
  };

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof BlogFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSaveDraft = async () => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('posts').insert({
        title: formData.title || 'Untitled Draft',
        slug: formData.slug || `draft-${Date.now()}`,
        hero_image_url: formData.hero_image_url || null,
        content: '',
        excerpt: '',
        tags: [],
        is_draft: true,
        published_at: getCurrentDateTime(),
      });

      if (error) throw error;

      showToast('success', 'Draft saved successfully');
      setHasUnsavedChanges(false);
      removeDraft(DRAFT_KEY);

      setTimeout(() => {
        navigate('/admin');
      }, 1500);
    } catch (error) {
      console.error('Error saving draft:', error);
      showToast('error', 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) {
      showToast('error', 'Please fix validation errors before publishing');
      return;
    }

    const slugValid = await validateSlugField();
    if (!slugValid) {
      showToast('error', 'Please fix the slug before publishing');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('posts').insert({
        title: formData.title,
        slug: formData.slug,
        hero_image_url: formData.hero_image_url || null,
        content: '',
        excerpt: '',
        tags: [],
        is_draft: false,
        published_at: getCurrentDateTime(),
      });

      if (error) throw error;

      showToast('success', 'Post published successfully');
      setHasUnsavedChanges(false);
      removeDraft(DRAFT_KEY);

      setTimeout(() => {
        navigate('/admin');
      }, 1500);
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
      hero_image_url: '',
    });
    setErrors({});
    setHasUnsavedChanges(false);
    removeDraft(DRAFT_KEY);
    setShowDiscardDialog(false);
    showToast('success', 'Changes discarded');
  };

  return (
    <AdminLayout currentSection="Create New Post">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="max-w-4xl mx-auto">
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
                error={errors.title}
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
                    <Tooltip content="The slug is the URL-friendly version of your post title. It should be lowercase, use hyphens instead of spaces, and contain only letters, numbers, and hyphens. Example: 'my-awesome-post'" />
                  </div>
                  <FormInput
                    label=""
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    onBlur={validateSlugField}
                    placeholder="enter-url-slug"
                    required
                    error={errors.slug}
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
              <FormInput
                label="Hero Image URL"
                value={formData.hero_image_url}
                onChange={(e) => handleChange('hero_image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
                helperText="Enter a URL to an image for the post hero section"
              />

              {formData.hero_image_url && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={16} className="text-neutral-600" />
                    <span className="text-sm font-medium text-neutral-600">Preview</span>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-neutral-200">
                    <img
                      src={formData.hero_image_url}
                      alt="Hero preview"
                      className="w-full h-64 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f5f5f5" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EInvalid Image URL%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-8 bg-white border-t border-neutral-200 py-4 px-8 -mx-6 flex items-center justify-between gap-4 shadow-lg">
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
      </div>

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
