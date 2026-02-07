import { supabase } from '../lib/supabase';
import { TipTapContent, ImpactMetric, Recommendation, ProjectType } from '../types';

export interface ProjectData {
  slug: string;
  type_id: string;
  title: string;
  client_name: string;
  client_logo_url?: string | null;
  hero_image_large: string;
  hero_image_thumbnail: string;
  description: TipTapContent;
  tasks?: string[];
  impact_metrics?: ImpactMetric[] | null;
  recommendation?: Recommendation | null;
  is_draft?: boolean;
}

export interface SaveProjectResult {
  success: boolean;
  error?: string;
  projectId?: string;
  slug?: string;
}

export async function createProject(data: ProjectData): Promise<SaveProjectResult> {
  try {
    const { data: result, error } = await supabase
      .from('projects')
      .insert({
        slug: data.slug,
        type_id: data.type_id,
        title: data.title,
        client_name: data.client_name,
        client_logo_url: data.client_logo_url || null,
        hero_image_large: data.hero_image_large,
        hero_image_thumbnail: data.hero_image_thumbnail,
        description: data.description as any,
        tasks: data.tasks || [],
        impact_metrics: data.impact_metrics || null,
        recommendation: data.recommendation || null,
        is_draft: data.is_draft ?? true,
      })
      .select('id, slug')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, projectId: result.id, slug: result.slug };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function updateProject(
  projectId: string,
  data: Partial<ProjectData>
): Promise<SaveProjectResult> {
  try {
    const updateData: Record<string, any> = {};
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.type_id !== undefined) updateData.type_id = data.type_id;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.client_name !== undefined) updateData.client_name = data.client_name;
    if (data.client_logo_url !== undefined) updateData.client_logo_url = data.client_logo_url;
    if (data.hero_image_large !== undefined) updateData.hero_image_large = data.hero_image_large;
    if (data.hero_image_thumbnail !== undefined) updateData.hero_image_thumbnail = data.hero_image_thumbnail;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.tasks !== undefined) updateData.tasks = data.tasks;
    if (data.impact_metrics !== undefined) updateData.impact_metrics = data.impact_metrics;
    if (data.recommendation !== undefined) updateData.recommendation = data.recommendation;
    if (data.is_draft !== undefined) updateData.is_draft = data.is_draft;

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, projectId, slug: data.slug };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function deleteProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function loadProjectForEdit(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_type:project_types(*),
        project_content(
          *,
          content(*, content_type:content_types(*))
        )
      `)
      .eq('id', projectId)
      .maybeSingle();

    if (error) return { success: false as const, error: error.message };
    if (!data) return { success: false as const, error: 'Project not found' };

    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function loadProjectTypes(): Promise<ProjectType[]> {
  const { data, error } = await supabase
    .from('project_types')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error loading project types:', error);
    return [];
  }

  return data || [];
}

export async function toggleProjectDraft(
  projectId: string,
  isDraft: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ is_draft: isDraft })
      .eq('id', projectId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
