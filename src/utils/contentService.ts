import { supabase } from '../lib/supabase';
import { Content, ContentType } from '../types';

export interface ContentData {
  type_id: string;
  title: string;
  caption?: string | null;
  url: string;
  platform?: 'youtube' | 'vimeo' | 'mega' | 'instagram' | null;
  format?: 'landscape' | 'portrait';
}

export async function createContent(
  data: ContentData
): Promise<{ success: boolean; data?: Content; error?: string }> {
  try {
    const { data: result, error } = await supabase
      .from('content')
      .insert({
        type_id: data.type_id,
        title: data.title,
        caption: data.caption || null,
        url: data.url,
        platform: data.platform || null,
        format: data.format || 'landscape',
      })
      .select('*, content_type:content_types(*)')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: result as unknown as Content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function loadAllContent(): Promise<Content[]> {
  const { data, error } = await supabase
    .from('content')
    .select('*, content_type:content_types(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading content:', error);
    return [];
  }

  return (data || []) as unknown as Content[];
}

export async function deleteContent(
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('content').delete().eq('id', contentId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function addContentToProject(
  projectId: string,
  contentId: string,
  orderIndex: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('project_content')
      .insert({
        project_id: projectId,
        content_id: contentId,
        order_index: orderIndex,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function removeContentFromProject(
  projectId: string,
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('project_content')
      .delete()
      .eq('project_id', projectId)
      .eq('content_id', contentId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function reorderProjectContent(
  projectId: string,
  items: Array<{ content_id: string; order_index: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    for (const item of items) {
      const { error } = await supabase
        .from('project_content')
        .update({ order_index: item.order_index })
        .eq('project_id', projectId)
        .eq('content_id', item.content_id);

      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function loadContentTypes(): Promise<ContentType[]> {
  const { data, error } = await supabase
    .from('content_types')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error loading content types:', error);
    return [];
  }

  return data || [];
}
