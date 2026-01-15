import { ContentBlock, Source } from '../types';
import { validateSlug } from './validateSlug';
import { checkSlugUniqueness } from './checkSlugUniqueness';

export interface BlogFormValidationData {
  title: string;
  slug: string;
  hero_image_url: string;
  contentBlocks: ContentBlock[];
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

    if (!data.hero_image_url.trim()) {
      errors.push({ field: 'hero_image_url', message: 'Hero image URL is required' });
    } else {
      try {
        new URL(data.hero_image_url);
      } catch {
        errors.push({ field: 'hero_image_url', message: 'Please enter a valid URL' });
      }
    }

    if (data.contentBlocks.length === 0) {
      errors.push({ field: 'contentBlocks', message: 'At least one content block is required' });
    } else {
      const hasEmptyBlocks = data.contentBlocks.some(block => {
        if (block.type === 'subtitle' || block.type === 'body') {
          return !block.content.trim();
        }
        if (block.type === 'list') {
          return block.items.length === 0 || block.items.every(item => !item.trim());
        }
        if (block.type === 'image') {
          return !block.url.trim();
        }
        return false;
      });

      if (hasEmptyBlocks) {
        errors.push({ field: 'contentBlocks', message: 'Some content blocks are empty. Please fill them in or remove them.' });
      }
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
