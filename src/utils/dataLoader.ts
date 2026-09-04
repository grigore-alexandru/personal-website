import { cache } from 'react';
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

// Minimal select for count queries that need project_type.name resolvable
// by PostgREST when a search filter spans the joined table.
const PROJECT_COUNT_SELECT = '*, project_type:project_types(name)';

export interface ProjectFilters {
  q?: string;
  type?: string;
  client?: string;
}

function applyProjectFilters(
  query: any,
  filters: ProjectFilters,
  typeId: string | null
): any {
  if (typeId) query = query.eq('type_id', typeId);
  if (filters.client && filters.client !== 'all') query = query.eq('client_name', filters.client);
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    // project_type.name uses the join alias declared in PROJECT_SELECT /
    // PROJECT_COUNT_SELECT — PostgREST resolves it via the embedded join.
    query = query.or(`title.ilike.%${q}%,client_name.ilike.%${q}%,project_type.name.ilike.%${q}%`);
  }
  return query;
}

async function resolveProjectTypeId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('project_types')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return data?.id ?? null;
}

export const loadProjects = async (
  limit: number = 24,
  offset: number = 0,
  filters: ProjectFilters = {}
): Promise<Project[]> => {
  const typeId =
    filters.type && filters.type !== 'all'
      ? await resolveProjectTypeId(filters.type)
      : null;

  if (filters.type && filters.type !== 'all' && !typeId) return [];

  let query = supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('is_draft', false)
    .order('order_index', { ascending: false });

  query = applyProjectFilters(query, filters, typeId);
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('Error loading projects:', error);
    return [];
  }

  if (!data) return [];

  return data.map(mapProjectRow);
};

export const countProjects = async (filters: ProjectFilters = {}): Promise<number> => {
  const typeId =
    filters.type && filters.type !== 'all'
      ? await resolveProjectTypeId(filters.type)
      : null;

  if (filters.type && filters.type !== 'all' && !typeId) return 0;

  let query = supabase
    .from('projects')
    // PROJECT_COUNT_SELECT embeds project_type:project_types(name) so
    // PostgREST can resolve project_type.name in the search .or() filter.
    // head:true means no rows are returned — only the count.
    .select(PROJECT_COUNT_SELECT, { count: 'exact', head: true })
    .eq('is_draft', false);

  query = applyProjectFilters(query, filters, typeId);

  const { count, error } = await query;

  if (error) {
    console.error('Error counting projects:', error);
    return 0;
  }

  return count || 0;
};

// cache(): generateMetadata and the page component both call this.
export const loadProject = cache(async (slug: string): Promise<Project | null> => {
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
});

/**
 * The two projects either side of `orderIndex` in the portfolio ordering.
 *
 * Replaces `loadProjects(200, 0)` on the detail page, which pulled every
 * project — each with its project_content and nested content joins — purely to
 * find two neighbours by array index. These are two indexed lookups returning
 * one row each, and they return full Project objects so ProjectNavigation is
 * unchanged.
 *
 * `loadProjects` orders by order_index DESC, so "previous" is the higher index.
 */
export const loadAdjacentProjects = async (
  orderIndex: number
): Promise<{ prevProject: Project | null; nextProject: Project | null }> => {
  const [prevResult, nextResult] = await Promise.all([
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('is_draft', false)
      .gt('order_index', orderIndex)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('is_draft', false)
      .lt('order_index', orderIndex)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    prevProject: prevResult.data ? mapProjectRow(prevResult.data) : null,
    nextProject: nextResult.data ? mapProjectRow(nextResult.data) : null,
  };
};

function mapProjectRow(row: any): Project {
  const sortedContent = (row.project_content || [])
    .filter((pc: any) => pc.content != null)
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
        thumbnail: pc.content.thumbnail ?? null,
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
    order_index: row.order_index ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    project_content: sortedContent,
  };
}

export const generateProjectUrl = (project: Project): string => {
  return `/portfolio/projects/${project.slug}`;
};

/** Nodes that end a run of text. Without them every paragraph in a post ran
 *  straight into the next one in the meta description ("...ideeaÎn ziua..."). */
const TIPTAP_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'listItem',
  'blockquote',
  'codeBlock',
  'tableRow',
]);

export function extractTextFromTipTap(doc: TipTapContent | null | undefined): string {
  if (!doc) return '';
  if (doc.text) return doc.text;
  if (!doc.content) return '';

  // Inline nodes (marks, text spans) join with nothing so words stay intact;
  // block nodes get a trailing space so sentences do not fuse together.
  const inner = doc.content.map((node) => extractTextFromTipTap(node)).join('');
  return TIPTAP_BLOCK_TYPES.has((doc as { type?: string }).type ?? '') ? `${inner} ` : inner;
}

export function parseMetricValue(value?: string): number {
  if (!value) return 0;
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  if (value.toUpperCase().endsWith('M')) return num * 1_000_000;
  if (value.toUpperCase().endsWith('K')) return num * 1_000;
  return num;
}
