import { Project, TipTapContent } from '../types';
import { supabase } from '../lib/supabase';

const PROJECT_SELECT = `
  *,
  project_type:project_types(*),
  project_content(
    *,
    content(*, content_type:content_types(*))
  )
`;

export const loadProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('is_draft', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading projects:', error);
    return [];
  }

  if (!data) return [];

  return data.map(mapProjectRow);
};

export const loadProject = async (slug: string): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('slug', slug)
    .eq('is_draft', false)
    .maybeSingle();

  if (error) {
    console.error('Error loading project:', error);
    return null;
  }

  if (!data) return null;

  return mapProjectRow(data);
};

function mapProjectRow(row: any): Project {
  const sortedContent = (row.project_content || [])
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((pc: any) => ({
      id: pc.id,
      content_id: pc.content_id,
      order_index: pc.order_index,
      content: {
        id: pc.content.id,
        type_id: pc.content.type_id,
        content_type: pc.content.content_type,
        title: pc.content.title,
        caption: pc.content.caption,
        url: pc.content.url,
        platform: pc.content.platform,
        format: pc.content.format,
        created_at: pc.content.created_at,
      },
    }));

  return {
    id: row.id,
    slug: row.slug,
    type_id: row.type_id,
    project_type: row.project_type,
    title: row.title,
    client_name: row.client_name,
    client_logo_url: row.client_logo_url,
    hero_image_large: row.hero_image_large,
    hero_image_thumbnail: row.hero_image_thumbnail,
    description: row.description,
    tasks: row.tasks || [],
    impact_metrics: row.impact_metrics,
    recommendation: row.recommendation,
    is_draft: row.is_draft,
    created_at: row.created_at,
    updated_at: row.updated_at,
    project_content: sortedContent,
  };
}

export const generateProjectUrl = (project: Project): string => {
  return `/portfolio/project/${project.slug}`;
};

export function extractTextFromTipTap(doc: TipTapContent | null | undefined): string {
  if (!doc) return '';
  if (doc.text) return doc.text;
  if (!doc.content) return '';
  return doc.content.map(node => extractTextFromTipTap(node)).join('');
}

export function parseMetricValue(value?: string): number {
  if (!value) return 0;
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  if (value.toUpperCase().endsWith('M')) return num * 1_000_000;
  if (value.toUpperCase().endsWith('K')) return num * 1_000;
  return num;
}
