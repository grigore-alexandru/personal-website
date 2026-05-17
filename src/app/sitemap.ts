import { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '../lib/supabase/server';
import { SITE_URL } from '../config/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabaseClient();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/portfolio`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/portfolio/projects`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/portfolio/content`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/story`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  const [postsResult, projectsResult, contentResult] = await Promise.all([
    supabase
      .from('posts')
      .select('slug, published_at, updated_at')
      .eq('is_draft', false)
      .order('published_at', { ascending: false })
      .limit(500),
    supabase
      .from('projects')
      .select('slug, updated_at, created_at')
      .eq('is_draft', false)
      .limit(500),
    supabase
      .from('content')
      .select('slug, updated_at, created_at')
      .eq('is_draft', false)
      .limit(500),
  ] as const);

  const posts = (postsResult.data ?? []) as Array<{ slug: string; published_at: string; updated_at: string | null }>;
  const projects = (projectsResult.data ?? []) as Array<{ slug: string; updated_at: string | null; created_at: string }>;
  const contentItems = (contentResult.data ?? []) as Array<{ slug: string; updated_at: string | null; created_at: string }>;

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updated_at ? new Date(post.updated_at) : new Date(post.published_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${SITE_URL}/portfolio/projects/${project.slug}`,
    lastModified: new Date(project.updated_at ?? project.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const contentEntries: MetadataRoute.Sitemap = contentItems.map((item) => ({
    url: `${SITE_URL}/portfolio/content/${item.slug}`,
    lastModified: new Date(item.updated_at ?? item.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...postEntries, ...projectEntries, ...contentEntries];
}
