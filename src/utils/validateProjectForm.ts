import { TipTapContent } from '../types';
import { validateSlug } from './validateSlug';
import { supabase } from '../lib/supabase';

export interface ProjectFormValidationData {
  title: string;
  slug: string;
  type_id: string;
  client_name: string;
  description: TipTapContent;
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
  if (content.text) text += content.text;
  if (content.content && Array.isArray(content.content)) {
    for (const child of content.content) {
      text += extractTextFromTipTap(child);
    }
  }
  return text;
}

async function checkProjectSlugUniqueness(slug: string, excludeId?: string): Promise<boolean> {
  try {
    let query = supabase.from('projects').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) return false;
    return !data;
  } catch {
    return false;
  }
}

export async function validateProjectForm(
  data: ProjectFormValidationData,
  isDraft: boolean = false,
  projectId?: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  if (!isDraft) {
    if (!data.title.trim()) {
      errors.push({ field: 'title', message: 'Title is required' });
    } else if (data.title.length < 3) {
      errors.push({ field: 'title', message: 'Title must be at least 3 characters' });
    }

    if (!data.slug.trim()) {
      errors.push({ field: 'slug', message: 'Slug is required' });
    } else {
      const slugValidation = validateSlug(data.slug);
      if (!slugValidation.isValid) {
        errors.push({ field: 'slug', message: slugValidation.error || 'Invalid slug format' });
      } else {
        const isUnique = await checkProjectSlugUniqueness(data.slug, projectId);
        if (!isUnique) {
          errors.push({ field: 'slug', message: 'This slug is already in use' });
        }
      }
    }

    if (!data.type_id) {
      errors.push({ field: 'type_id', message: 'Project type is required' });
    }

    if (!data.client_name.trim()) {
      errors.push({ field: 'client_name', message: 'Client name is required' });
    }

    const descText = extractTextFromTipTap(data.description);
    if (!descText.trim()) {
      errors.push({ field: 'description', message: 'Description is required' });
    }
  }

  return { isValid: errors.length === 0, errors };
}
