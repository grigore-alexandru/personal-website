import { supabase } from '../lib/supabase';
import { ContentBlock, Source } from '../types';
import { getCurrentDateTime } from './dateUtils';

export interface BlogPostData {
  title: string;
  slug: string;
  hero_image_url: string;
  contentBlocks: ContentBlock[];
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
      hero_image_url: data.hero_image_url || null,
      content: data.contentBlocks,
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
      hero_image_url: data.hero_image_url || null,
      content: data.contentBlocks,
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
