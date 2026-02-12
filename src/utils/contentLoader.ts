import { supabase } from '../lib/supabase';
import { ContentWithProject } from '../types';

export async function loadAllPublishedContent(): Promise<ContentWithProject[]> {
  const { data, error } = await supabase
    .from('content')
    .select(`
      *,
      content_type:content_types(*),
      project_content(
        project:projects(
          id,
          title,
          client_name,
          project_type:project_types(name)
        )
      )
    `)
    .eq('is_draft', false)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading published content:', error);
    return [];
  }

  if (!data) return [];

  return data.map(mapContentWithProject);
}

export async function loadContentBySlug(slug: string): Promise<ContentWithProject | null> {
  const { data, error } = await supabase
    .from('content')
    .select(`
      *,
      content_type:content_types(*),
      project_content(
        project:projects(
          id,
          title,
          client_name,
          project_type:project_types(name)
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_draft', false)
    .maybeSingle();

  if (error) {
    console.error('Error loading content by slug:', error);
    return null;
  }

  if (!data) return null;

  return mapContentWithProject(data);
}

function mapContentWithProject(row: any): ContentWithProject {
  const projectAssociation = row.project_content?.[0]?.project;

  return {
    id: row.id,
    type_id: row.type_id,
    content_type: row.content_type,
    title: row.title,
    slug: row.slug,
    caption: row.caption,
    url: row.url,
    platform: row.platform,
    format: row.format,
    thumbnail: row.thumbnail,
    is_draft: row.is_draft,
    order_index: row.order_index,
    contributors: row.contributors,
    published_at: row.published_at,
    created_at: row.created_at,
    project_info: projectAssociation
      ? {
          project_id: projectAssociation.id,
          project_title: projectAssociation.title,
          client_name: projectAssociation.client_name,
          project_type_name: projectAssociation.project_type?.name || 'Unknown',
        }
      : null,
  };
}
