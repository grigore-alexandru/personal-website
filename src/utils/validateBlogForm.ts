import { Source, TipTapContent } from '../types';
import { validateSlug } from './validateSlug';
import { checkSlugUniqueness } from './checkSlugUniqueness';

export interface BlogFormValidationData {
  title: string;
  slug: string;
  content: TipTapContent;
  heroImageLarge?: string | null;
  heroImageThumbnail?: string | null;
  hasSources: boolean;
  sources: Source[];
  hasNotes: boolean;
  notesContent: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

function extractTextFromTipTap(content: TipTapContent): string {
  if (!content) return '';

  let text = '';

  if (content.text) {
    text += content.text;
  }

  if (content.content && Array.isArray(content.content)) {
    for (const child of content.content) {
      text += extractTextFromTipTap(child);
    }
  }

  return text;
}

function hasContentInTipTap(content: TipTapContent): boolean {
  const text = extractTextFromTipTap(content);
  return text.trim().length > 0;
}

export async function validateBlogForm(
  data: BlogFormValidationData,
  isDraft: boolean = false
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  if (!isDraft) {
    if (!data.title.trim()) {
      errors.push({ field: 'title', message: 'Title is required' });
    } else if (data.title.length < 3) {
      errors.push({ field: 'title', message: 'Title must be at least 3 characters' });
    } else if (data.title.length > 200) {
      errors.push({ field: 'title', message: 'Title must be less than 200 characters' });
    }

    if (!data.slug.trim()) {
      errors.push({ field: 'slug', message: 'Slug is required' });
    } else {
      const slugValidation = validateSlug(data.slug);
      if (!slugValidation.isValid) {
        errors.push({ field: 'slug', message: slugValidation.error || 'Invalid slug format' });
      } else {
        const isUnique = await checkSlugUniqueness(data.slug);
        if (!isUnique) {
          errors.push({ field: 'slug', message: 'This slug is already in use' });
        }
      }
    }

    if (!data.content || !hasContentInTipTap(data.content)) {
      errors.push({ field: 'content', message: 'Blog post content is required' });
    }

    if (!data.heroImageLarge || !data.heroImageThumbnail) {
      errors.push({ field: 'heroImage', message: 'Hero image is required for published posts' });
    }
  }

  if (data.hasSources) {
    const completeSources = data.sources.filter(
      source => source.title.trim() && source.url.trim()
    );

    if (completeSources.length === 0) {
      errors.push({
        field: 'sources',
        message: 'At least one complete source (with title and URL) is required when sources are enabled',
      });
    } else {
      const invalidUrls = data.sources.filter(source => {
        if (!source.url.trim()) return false;
        try {
          new URL(source.url);
          return false;
        } catch {
          return true;
        }
      });

      if (invalidUrls.length > 0) {
        errors.push({
          field: 'sources',
          message: 'Some source URLs are invalid. Please fix them or remove the sources.',
        });
      }
    }
  }

  if (data.hasNotes && !data.notesContent.trim()) {
    errors.push({
      field: 'notes',
      message: 'Notes content is required when notes section is enabled',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
