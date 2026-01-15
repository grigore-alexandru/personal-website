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
  hasSources: boolean;
  sourcesData: Source[];
  hasNotes: boolean;
  notesContent: string;
  publishedAt: string;
}

export const loadPost = async (slug: string): Promise<BlogPost | null> => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

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
    hasSources: data.has_sources,
    sourcesData: data.sources_data as Source[],
    hasNotes: data.has_notes,
    notesContent: data.notes_content,
    publishedAt: data.published_at,
  };
};

export const loadAllPosts = async (): Promise<BlogPost[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error loading posts:', error);
    return [];
  }

  if (!data) return [];

  return data.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt || '',
    tags: post.tags || [],
    hasSources: post.has_sources,
    sourcesData: post.sources_data as Source[],
    hasNotes: post.has_notes,
    notesContent: post.notes_content,
    publishedAt: post.published_at,
  }));
};
