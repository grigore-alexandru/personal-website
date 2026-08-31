'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { FormInput } from '../forms/FormInput';
import { FormTextarea } from '../forms/FormTextarea';
import { Button } from '../forms/Button';
import { slugify } from '../../utils/slugify';
import { checkDocumentSlugUniqueness } from '../../utils/documentsService';
import { validateSlug } from '../../utils/validateSlug';
import { DocumentFileUpload, type UploadedDocumentFile } from './DocumentFileUpload';
import { SITE_URL } from '../../config/site';
import type { DocumentFormErrors, NewDocumentInput } from '../../types/documents';

const DESCRIPTION_MAX_LENGTH = 300;
const TITLE_MAX_LENGTH = 200;

interface NewDocumentCardProps {
  onCreate: (input: NewDocumentInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * The creation card. Modeled on NewLinkCard.tsx, with one structural
 * difference: `documents.file_url` is NOT NULL, so unlike a link (which can
 * be created immediately, then edited), a document can't be inserted until
 * its PDF has actually finished uploading. The slug has to be locked in
 * first too, since the upload's S4 key is derived from it.
 */
export function NewDocumentCard({ onCreate, onCancel }: NewDocumentCardProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<DocumentFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugConfirmed, setSlugConfirmed] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedDocumentFile | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const setError = (field: keyof DocumentFormErrors, message?: string) =>
    setErrors((prev) => ({ ...prev, [field]: message }));

  const validateTitle = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Title is required';
    if (trimmed.length > TITLE_MAX_LENGTH) return `Title must be ${TITLE_MAX_LENGTH} characters or fewer`;
    return undefined;
  };

  const runSlugCheck = async (value: string) => {
    const formatError = validateSlug(value).error;
    if (formatError) {
      setError('slug', formatError);
      return;
    }
    setCheckingSlug(true);
    try {
      const free = await checkDocumentSlugUniqueness(value);
      if (!free) {
        setError('slug', 'That slug is already taken');
      } else {
        setError('slug', undefined);
        setSlugConfirmed(true);
      }
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSlugBlur = () => void runSlugCheck(slug);

  // Any change to the slug invalidates a previously-confirmed upload target —
  // the uploaded PDF would otherwise sit under the old slug's storage key.
  // The uniqueness check then re-runs automatically after a short pause, so
  // the upload area unlocks on its own — it doesn't require the user to
  // manually blur the slug field (e.g. typing a title and going straight to
  // the file picker never fires a blur event on the slug input at all).
  useEffect(() => {
    setSlugConfirmed(false);
    setUploaded(null);

    if (!slug || validateSlug(slug).error) return;

    const timer = setTimeout(() => {
      void runSlugCheck(slug);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSave = async () => {
    const titleError = validateTitle(title);
    const slugError = validateSlug(slug).error;
    const descriptionError =
      description.length > DESCRIPTION_MAX_LENGTH
        ? `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`
        : undefined;

    const found: DocumentFormErrors = { title: titleError, slug: slugError, description: descriptionError };
    if (!uploaded) found.file = 'Upload a PDF before creating this document';

    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    if (!uploaded) return;

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onCreate({
        title: title.trim(),
        slug,
        description: description.trim() || null,
        fileUrl: uploaded.fileUrl,
        thumbnailUrl: uploaded.thumbnailUrl,
        fileSizeBytes: uploaded.fileSizeBytes,
        pageCount: uploaded.pageCount,
        tags: tags.length > 0 ? tags : null,
      });
    } catch (err) {
      setErrors({ slug: err instanceof Error ? err.message : 'Could not create this document' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="relative bg-white border-2 border-black rounded-lg shadow-lg">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-black">New document</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Discard new document"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <FormInput
          label="Title"
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setError('title', validateTitle(title))}
          error={errors.title}
          placeholder="Q4 Brand Presentation"
        />

        <div>
          <label htmlFor="new-document-slug" className="block text-sm font-medium text-black mb-2">
            Slug<span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-stretch gap-2">
            <span className="inline-flex items-center px-3 bg-neutral-100 border border-neutral-300 rounded-lg text-sm text-neutral-500 font-mono whitespace-nowrap">
              {SITE_URL.replace(/^https?:\/\//, '')}/documents/
            </span>
            <input
              id="new-document-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
                setError('slug', undefined);
              }}
              onBlur={handleSlugBlur}
              placeholder="q4-brand-presentation"
              className={`flex-1 min-w-0 px-4 py-3 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.slug
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-neutral-300 focus:ring-black focus:border-transparent'
              }`}
            />
            <button
              type="button"
              onClick={handleSlugBlur}
              title="Re-check availability"
              aria-label="Re-check slug availability"
              className="px-3 border border-neutral-300 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-50 transition-colors flex-shrink-0"
            >
              {checkingSlug ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
          {errors.slug ? (
            <p className="mt-2 text-sm text-red-600">{errors.slug}</p>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              Permanent once saved — shared links depend on it.
            </p>
          )}
        </div>

        <FormTextarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          maxLength={DESCRIPTION_MAX_LENGTH}
          showCharCount
          rows={2}
          placeholder="A short summary — shown on the page and used for the social preview card."
        />

        <FormInput
          label="Tags"
          helperText="Comma-separated. Not shown anywhere yet — for your own future filtering."
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="client-work, 2026, brand"
        />

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            PDF file<span className="text-red-500 ml-1">*</span>
          </label>
          <DocumentFileUpload
            slug={slugConfirmed ? slug : ''}
            disabled={!slugConfirmed}
            onUploaded={setUploaded}
          />
          {errors.file && <p className="mt-2 text-sm text-red-600">{errors.file}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
            Create document
          </Button>
        </div>
      </div>
    </article>
  );
}
