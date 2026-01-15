import { supabase } from '../lib/supabase';

export async function checkSlugUniqueness(slug: string, excludeId?: string): Promise<boolean> {
  try {
    let query = supabase
      .from('posts')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking slug uniqueness:', error);
      return false;
    }

    return !data;
  } catch (err) {
    console.error('Error checking slug uniqueness:', err);
    return false;
  }
}
