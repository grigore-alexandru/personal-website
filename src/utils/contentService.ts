import { supabase } from '../lib/supabase';
import { Content, ContentType, ContentThumbnail, ContentContributor, ContentWithProject } from '../types';
import { deleteVideoThumbnails } from './contentVideoProcessing';
import { deleteContentImages } from './contentImageProcessing';

export interface ContentData {
  type_id: string;
  title: string;
  slug: string;
  caption?: string | null;
  url: string;
  platform?: 'youtube' | 'vimeo' | 'mega' | 'instagram' | null;
  format?: 'landscape' | 'portrait';
  thumbnail?: ContentThumbnail | null;
  is_draft?: boolean;
  order_index?: number;
  contributors?: ContentContributor[] | null;
  published_at?: string | null;
}

export async function createContent(
  data: ContentData
): Promise<{ success: boolean; data?: Content; error?: string }> {
  try {
    const { data: maxResult } = await supabase
      .from('content')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextIndex = (maxResult?.order_index ?? -1) + 1;

    const { data: result, error } = await supabase
      .from('content')
      .insert({
        type_id: data.type_id,
        title: data.title,
        slug: data.slug,
        caption: data.caption || null,
        url: data.url,
        platform: data.platform || null,
        format: data.format || 'landscape',
        thumbnail: data.thumbnail || null,
        is_draft: data.is_draft ?? true,
        order_index: nextIndex,
        contributors: data.contributors || null,
        published_at: data.published_at || null,
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

export async function updateContent(
  contentId: string,
  data: Partial<ContentData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, any> = {};
    if (data.type_id !== undefined) updateData.type_id = data.type_id;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.caption !== undefined) updateData.caption = data.caption;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.format !== undefined) updateData.format = data.format;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    if (data.is_draft !== undefined) updateData.is_draft = data.is_draft;
    if (data.order_index !== undefined) updateData.order_index = data.order_index;
    if (data.contributors !== undefined) updateData.contributors = data.contributors;
    if (data.published_at !== undefined) updateData.published_at = data.published_at;

    const { error } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', contentId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function loadContentForEdit(contentId: string) {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('*, content_type:content_types(*)')
      .eq('id', contentId)
      .maybeSingle();

    if (error) return { success: false as const, error: error.message };
    if (!data) return { success: false as const, error: 'Content not found' };

    return { success: true as const, data: data as unknown as Content };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function toggleContentDraft(
  contentId: string,
  isDraft: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { is_draft: isDraft };

    if (!isDraft && !updateData.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', contentId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export interface ContentAdminItem extends Content {
  project_id: string | null;
  project_title: string | null;
}

export async function loadAllContentForAdmin(): Promise<ContentAdminItem[]> {
  const [contentResult, projectContentResult] = await Promise.all([
    supabase
      .from('content')
      .select('*, content_type:content_types(*)')
      .order('order_index', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('project_content')
      .select('content_id, project_id, projects(id, title)'),
  ]);

  if (contentResult.error) {
    console.error('Error loading content for admin:', contentResult.error);
    return [];
  }

  const projectMap = new Map<string, { id: string; title: string }>();
  if (!projectContentResult.error && projectContentResult.data) {
    for (const row of projectContentResult.data) {
      const projects = row.projects as unknown as { id: string; title: string } | { id: string; title: string }[] | null;
      const project = Array.isArray(projects) ? projects[0] : projects;
      if (project && !projectMap.has(row.content_id)) {
        projectMap.set(row.content_id, { id: project.id, title: project.title });
      }
    }
  }

  return (contentResult.data || []).map((item) => {
    const project = projectMap.get(item.id) ?? null;
    return {
      ...(item as unknown as Content),
      project_id: project?.id ?? null,
      project_title: project?.title ?? null,
    };
  });
}

export async function updateContentOrder(
  items: Array<{ id: string; order_index: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    for (const item of items) {
      const { error } = await supabase
        .from('content')
        .update({ order_index: item.order_index })
        .eq('id', item.id);

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

export async function loadContentWithProjects(): Promise<(Content & { projects?: Array<{ id: string; title: string }> })[]> {
  const { data: contentData, error: contentError } = await supabase
    .from('content')
    .select('*, content_type:content_types(*)')
    .order('created_at', { ascending: false });

  if (contentError) {
    console.error('Error loading content:', contentError);
    return [];
  }

  const { data: projectContentData, error: projectContentError } = await supabase
    .from('project_content')
    .select('content_id, project:projects(id, title)');

  if (projectContentError) {
    console.error('Error loading project associations:', projectContentError);
    return (contentData || []) as unknown as Content[];
  }

  const projectsByContent = new Map<string, Array<{ id: string; title: string }>>();

  for (const pc of projectContentData || []) {
    if (pc.project) {
      const existing = projectsByContent.get(pc.content_id) || [];
      existing.push(pc.project as unknown as { id: string; title: string });
      projectsByContent.set(pc.content_id, existing);
    }
  }

  return (contentData || []).map((content) => ({
    ...(content as unknown as Content),
    projects: projectsByContent.get(content.id) || [],
  }));
}

export async function deleteContent(
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: content } = await supabase
      .from('content')
      .select('thumbnail')
      .eq('id', contentId)
      .maybeSingle();

    if (content?.thumbnail) {
      const thumbnail = content.thumbnail as any;

      if ('hover_video' in thumbnail) {
        await deleteVideoThumbnails(thumbnail.poster, thumbnail.hover_video);
      } else if ('poster' in thumbnail) {
        await deleteContentImages(thumbnail.poster);
      }
    }

    const { error } = await supabase.from('content').delete().eq('id', contentId);
    if (error) return { success: false, error: error.message };

    const { data: remaining } = await supabase
      .from('content')
      .select('id')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (remaining && remaining.length > 0) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from('content')
          .update({ order_index: i })
          .eq('id', remaining[i].id);
      }
    }

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

export async function checkContentSlugUniqueness(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('content')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking content slug uniqueness:', error);
      return false;
    }

    return !data;
  } catch (err) {
    console.error('Error checking content slug uniqueness:', err);
    return false;
  }
}

export async function countPublishedContent(): Promise<number> {
  const { count, error } = await supabase
    .from('content')
    .select('*', { count: 'exact', head: true })
    .eq('is_draft', false);

  if (error) {
    console.error('Error counting published content:', error);
    return 0;
  }

  return count || 0;
}

export async function loadPublishedContentWithProjects(
  limit: number = 30,
  offset: number = 0
): Promise<ContentWithProject[]> {
  const { data: contentData, error: contentError } = await supabase
    .from('content')
    .select('*, content_type:content_types(*)')
    .eq('is_draft', false)
    .order('order_index', { ascending: false })
    .range(offset, offset + limit - 1);

  if (contentError) {
    console.error('Error loading published content:', contentError);
    return [];
  }

  const contentIds = (contentData || []).map((c) => c.id);

  const { data: projectContentData, error: projectContentError } = await supabase
    .from('project_content')
    .select(`
      content_id,
      project:projects!inner(
        id,
        title,
        client_name,
        is_draft,
        project_type:project_types(name)
      )
    `)
    .in('content_id', contentIds)
    .eq('project.is_draft', false);

  if (projectContentError) {
    console.error('Error loading project associations:', projectContentError);
    return (contentData || []) as unknown as ContentWithProject[];
  }

  const projectInfoByContent = new Map<string, any>();

  for (const pc of projectContentData || []) {
    if (pc.project && !projectInfoByContent.has(pc.content_id)) {
      const project = pc.project as any;
      projectInfoByContent.set(pc.content_id, {
        project_id: project.id,
        project_title: project.title,
        client_name: project.client_name,
        project_type_name: project.project_type?.name || 'Unknown',
      });
    }
  }

  return (contentData || []).map((content) => ({
    ...(content as unknown as Content),
    project_info: projectInfoByContent.get(content.id) || null,
  }));
}

export async function loadContentBySlug(slug: string): Promise<ContentWithProject | null> {
  const { data: contentData, error: contentError } = await supabase
    .from('content')
    .select('*, content_type:content_types(*)')
    .eq('slug', slug)
    .eq('is_draft', false)
    .maybeSingle();

  if (contentError || !contentData) {
    console.error('Error loading content by slug:', contentError);
    return null;
  }

  const { data: projectContentData, error: projectContentError } = await supabase
    .from('project_content')
    .select(`
      content_id,
      project:projects!inner(
        id,
        title,
        client_name,
        is_draft,
        project_type:project_types(name)
      )
    `)
    .eq('content_id', contentData.id)
    .eq('project.is_draft', false)
    .maybeSingle();

  if (projectContentError) {
    console.error('Error loading project association:', projectContentError);
  }

  const projectInfo = projectContentData?.project ? {
    project_id: (projectContentData.project as any).id,
    project_title: (projectContentData.project as any).title,
    client_name: (projectContentData.project as any).client_name,
    project_type_name: (projectContentData.project as any).project_type?.name || 'Unknown',
  } : null;

  return {
    ...(contentData as unknown as Content),
    project_info: projectInfo,
  };
}
