import { supabase } from '../lib/supabase';
import { Source, TipTapContent } from '../types';
import { getCurrentDateTime } from './dateUtils';

export interface BlogPostData {
  title: string;
  slug: string;
  content: TipTapContent;
  heroImageLarge?: string | null;
  heroImageThumbnail?: string | null;
  hasSources: boolean;
  sources: Source[];
  hasNotes: boolean;
  notesContent: string;
  excerpt?: string;
  tags?: string[];
}

export interface SaveBlogPostResult {
  success: boolean;
  error?: string;
  postId?: string;
  slug?: string;
}

export async function saveBlogPost(
  data: BlogPostData,
  isDraft: boolean = false
): Promise<SaveBlogPostResult> {
  try {
    const postData = {
      title: data.title || (isDraft ? 'Untitled Draft' : ''),
      slug: data.slug || (isDraft ? `draft-${Date.now()}` : ''),
      content: data.content,
      hero_image_large: data.heroImageLarge || null,
      hero_image_thumbnail: data.heroImageThumbnail || null,
      has_sources: data.hasSources,
      sources_data: data.hasSources ? data.sources : [],
      has_notes: data.hasNotes,
      notes_content: data.hasNotes ? data.notesContent : '',
      excerpt: data.excerpt || '',
      tags: data.tags || [],
      is_draft: isDraft,
      published_at: getCurrentDateTime(),
    };

    const { data: insertedData, error } = await supabase
      .from('posts')
      .insert(postData)
      .select('id, slug')
      .single();

    if (error) {
      console.error('Error saving blog post:', error);
      return {
        success: false,
        error: error.message || 'Failed to save blog post',
      };
    }

    return {
      success: true,
      postId: insertedData.id,
      slug: insertedData.slug,
    };
  } catch (error) {
    console.error('Error saving blog post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function updateBlogPost(
  postId: string,
  data: BlogPostData,
  isDraft: boolean = false
): Promise<SaveBlogPostResult> {
  try {
    const postData = {
      title: data.title,
      slug: data.slug,
      content: data.content,
      hero_image_large: data.heroImageLarge || null,
      hero_image_thumbnail: data.heroImageThumbnail || null,
      has_sources: data.hasSources,
      sources_data: data.hasSources ? data.sources : [],
      has_notes: data.hasNotes,
      notes_content: data.hasNotes ? data.notesContent : '',
      excerpt: data.excerpt || '',
      tags: data.tags || [],
      is_draft: isDraft,
      updated_at: getCurrentDateTime(),
    };

    const { error } = await supabase
      .from('posts')
      .update(postData)
      .eq('id', postId);

    if (error) {
      console.error('Error updating blog post:', error);
      return {
        success: false,
        error: error.message || 'Failed to update blog post',
      };
    }

    return {
      success: true,
      postId,
      slug: data.slug,
    };
  } catch (error) {
    console.error('Error updating blog post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete post',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function loadPostForEdit(postId: string): Promise<{
  success: boolean;
  data?: BlogPostData;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (error) {
      console.error('Error loading post:', error);
      return {
        success: false,
        error: error.message || 'Failed to load post',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Post not found',
      };
    }

    return {
      success: true,
      data: {
        title: data.title || '',
        slug: data.slug || '',
        content: data.content || { type: 'doc', content: [] },
        heroImageLarge: data.hero_image_large || null,
        heroImageThumbnail: data.hero_image_thumbnail || null,
        hasSources: data.has_sources || false,
        sources: data.sources_data || [],
        hasNotes: data.has_notes || false,
        notesContent: data.notes_content || '',
        excerpt: data.excerpt || '',
        tags: data.tags || [],
      },
    };
  } catch (error) {
    console.error('Error loading post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
