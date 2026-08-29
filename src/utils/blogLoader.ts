import { supabase } from '../lib/supabase';

export interface Source {
  title: string;
  url: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: any;
  excerpt: string;
  tags: string[];
  heroImageLarge: string | null;
  heroImageThumbnail: string | null;
  hasSources: boolean;
  sourcesData: Source[];
  hasNotes: boolean;
  notesContent: string;
  publishedAt: string;
  isDraft?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogFilters {
  q?: string;
  date?: string;
}

function getDateCutoff(date: string): string | null {
  if (!date || date === 'all') return null;
  const now = new Date();
  const cutoff = new Date(now);
  if (date === 'week') cutoff.setDate(now.getDate() - 7);
  else if (date === 'month') cutoff.setMonth(now.getMonth() - 1);
  else if (date === 'year') cutoff.setFullYear(now.getFullYear() - 1);
  else return null;
  return cutoff.toISOString();
}

export const countAllPosts = async (filters: BlogFilters = {}): Promise<number> => {
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_draft', false);

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
  }

  const cutoff = getDateCutoff(filters.date ?? '');
  if (cutoff) query = query.gte('published_at', cutoff);

  const { count, error } = await query;

  if (error) {
    console.error('Error counting posts:', error);
    return 0;
  }

  return count || 0;
};

export const loadPost = async (slug: string): Promise<BlogPost | null> => {
  const { data: rawData, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  const data = rawData as any;

  if (error) {
    console.error('Error loading post:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    excerpt: data.excerpt || '',
    tags: data.tags || [],
    heroImageLarge: data.hero_image_large,
    heroImageThumbnail: data.hero_image_thumbnail,
    hasSources: data.has_sources,
    sourcesData: data.sources_data as Source[],
    hasNotes: data.has_notes,
    notesContent: data.notes_content,
    publishedAt: data.published_at,
  };
};

export const loadAllPosts = async (
  limit: number = 20,
  offset: number = 0,
  filters: BlogFilters = {}
): Promise<BlogPost[]> => {
  let query = supabase
    .from('posts')
    .select('id, title, slug, excerpt, tags, hero_image_large, hero_image_thumbnail, has_sources, sources_data, has_notes, notes_content, published_at, content')
    .eq('is_draft', false)
    .order('published_at', { ascending: false });

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
  }

  const cutoff = getDateCutoff(filters.date ?? '');
  if (cutoff) query = query.gte('published_at', cutoff);

  query = query.range(offset, offset + limit - 1);

  const { data: rawData, error } = await query;
  const data = rawData as any[];

  if (error) {
    console.error('Error loading posts:', error);
    return [];
  }

  if (!data) return [];

  return data.map((post: any) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt || '',
    tags: post.tags || [],
    heroImageLarge: post.hero_image_large,
    heroImageThumbnail: post.hero_image_thumbnail,
    hasSources: post.has_sources,
    sourcesData: post.sources_data as Source[],
    hasNotes: post.has_notes,
    notesContent: post.notes_content,
    publishedAt: post.published_at,
  }));
};

export const loadAllPostsForAdmin = async (): Promise<BlogPost[]> => {
  const { data: rawAdminData, error } = await supabase
    .from('posts')
    .select('*')
    .order('updated_at', { ascending: false });
  const data = rawAdminData as any[];

  if (error) {
    console.error('Error loading posts for admin:', error);
    return [];
  }

  if (!data) return [];

  return data.map((post: any) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt || '',
    tags: post.tags || [],
    heroImageLarge: post.hero_image_large,
    heroImageThumbnail: post.hero_image_thumbnail,
    hasSources: post.has_sources,
    sourcesData: post.sources_data as Source[],
    hasNotes: post.has_notes,
    notesContent: post.notes_content,
    publishedAt: post.published_at,
    isDraft: post.is_draft,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  }));
};
