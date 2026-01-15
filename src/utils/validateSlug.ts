export interface SlugValidation {
  isValid: boolean;
  error?: string;
}

export function validateSlug(slug: string): SlugValidation {
  if (!slug || slug.trim().length === 0) {
    return {
      isValid: false,
      error: 'Slug is required',
    };
  }

  if (slug.length < 3) {
    return {
      isValid: false,
      error: 'Slug must be at least 3 characters long',
    };
  }

  if (slug.length > 100) {
    return {
      isValid: false,
      error: 'Slug must be less than 100 characters',
    };
  }

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    return {
      isValid: false,
      error: 'Slug can only contain lowercase letters, numbers, and hyphens',
    };
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return {
      isValid: false,
      error: 'Slug cannot start or end with a hyphen',
    };
  }

  return { isValid: true };
}
