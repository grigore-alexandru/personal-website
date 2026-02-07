export interface ProjectType {
  id: string;
  name: string;
  slug: string;
}

export interface ContentType {
  id: string;
  name: string;
  slug: string;
}

export interface ImpactMetric {
  label: string;
  value: string;
}

export interface Recommendation {
  name: string;
  role: string;
  text: TipTapContent;
}

export interface Content {
  id: string;
  type_id: string;
  content_type: ContentType;
  title: string;
  caption: string | null;
  url: string;
  platform: 'youtube' | 'vimeo' | 'mega' | 'instagram' | null;
  format: 'landscape' | 'portrait';
  created_at: string;
}

export interface ProjectContentItem {
  id: string;
  content_id: string;
  order_index: number;
  content: Content;
}

export interface Project {
  id: string;
  slug: string;
  type_id: string;
  project_type: ProjectType;
  title: string;
  client_name: string;
  client_logo_url: string | null;
  hero_image_large: string;
  hero_image_thumbnail: string;
  description: TipTapContent;
  tasks: string[];
  impact_metrics: ImpactMetric[] | null;
  recommendation: Recommendation | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  project_content: ProjectContentItem[];
}

export interface Filter {
  id: string;
  label: string;
  active: boolean;
}

export interface Source {
  id: string;
  title: string;
  url: string;
}

export interface TipTapContent {
  type: string;
  content?: TipTapContent[];
  attrs?: Record<string, any>;
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, any>;
  }>;
}

export interface BlogFormData {
  title: string;
  slug: string;
  content: TipTapContent;
  excerpt: string;
  tags: string[];
  heroImageLarge: string | null;
  heroImageThumbnail: string | null;
  hasSources: boolean;
  sources: Source[];
  hasNotes: boolean;
  notesContent: string;
}
