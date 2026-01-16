export interface Project {
  id?: string;
  title: string;
  type: string;
  client_type: string;
  client_name: string;
  client_logo: string;
  date: string;
  reach: {
    views: number;
    channels: string[];
    impressions: number;
  };
  poster: string;
  videos: Video[];
  description: string;
  testimonial: {
    client: string;
    text: string;
    role?: string;
  };
}

export interface Video {
  title: string;
  platform: 'youtube' | 'vimeo' | 'mega' | 'instagram';
  link: string;
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