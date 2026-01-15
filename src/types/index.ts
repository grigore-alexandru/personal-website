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

export type ContentBlockType = 'subtitle' | 'body' | 'list' | 'image';

export interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
}

export interface SubtitleBlock extends BaseContentBlock {
  type: 'subtitle';
  content: string;
}

export interface BodyBlock extends BaseContentBlock {
  type: 'body';
  content: string;
}

export interface ListBlock extends BaseContentBlock {
  type: 'list';
  items: string[];
}

export interface ImageBlock extends BaseContentBlock {
  type: 'image';
  url: string;
  alt: string;
}

export type ContentBlock = SubtitleBlock | BodyBlock | ListBlock | ImageBlock;

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
  hasSources: boolean;
  sources: Source[];
  hasNotes: boolean;
  notesContent: string;
}