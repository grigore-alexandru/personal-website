export interface Database {
  public: {
    Tables: {
      project_types: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
      };
      content_types: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          slug: string;
          type_id: string;
          title: string;
          client_name: string;
          client_logo_url: string | null;
          hero_image_large: string;
          hero_image_thumbnail: string;
          description: any;
          tasks: string[];
          impact_metrics: any | null;
          recommendation: any | null;
          is_draft: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          type_id: string;
          title: string;
          client_name: string;
          client_logo_url?: string | null;
          hero_image_large?: string;
          hero_image_thumbnail?: string;
          description?: any;
          tasks?: string[];
          impact_metrics?: any | null;
          recommendation?: any | null;
          is_draft?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          type_id?: string;
          title?: string;
          client_name?: string;
          client_logo_url?: string | null;
          hero_image_large?: string;
          hero_image_thumbnail?: string;
          description?: any;
          tasks?: string[];
          impact_metrics?: any | null;
          recommendation?: any | null;
          is_draft?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      content: {
        Row: {
          id: string;
          type_id: string;
          title: string;
          caption: string | null;
          url: string;
          platform: 'youtube' | 'vimeo' | 'mega' | 'instagram' | null;
          format: 'landscape' | 'portrait';
          created_at: string;
        };
        Insert: {
          id?: string;
          type_id: string;
          title: string;
          caption?: string | null;
          url: string;
          platform?: 'youtube' | 'vimeo' | 'mega' | 'instagram' | null;
          format?: 'landscape' | 'portrait';
          created_at?: string;
        };
        Update: {
          id?: string;
          type_id?: string;
          title?: string;
          caption?: string | null;
          url?: string;
          platform?: 'youtube' | 'vimeo' | 'mega' | 'instagram' | null;
          format?: 'landscape' | 'portrait';
          created_at?: string;
        };
      };
      project_content: {
        Row: {
          id: string;
          project_id: string;
          content_id: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          project_id: string;
          content_id: string;
          order_index?: number;
        };
        Update: {
          id?: string;
          project_id?: string;
          content_id?: string;
          order_index?: number;
        };
      };
      posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: any;
          excerpt: string;
          tags: string[];
          hero_image_large: string | null;
          hero_image_thumbnail: string | null;
          has_sources: boolean;
          sources_data: Array<{
            title: string;
            url: string;
          }>;
          has_notes: boolean;
          notes_content: string;
          is_draft: boolean;
          published_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          content?: any;
          excerpt?: string;
          tags?: string[];
          hero_image_large?: string | null;
          hero_image_thumbnail?: string | null;
          has_sources?: boolean;
          sources_data?: Array<{
            title: string;
            url: string;
          }>;
          has_notes?: boolean;
          notes_content?: string;
          is_draft?: boolean;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          content?: any;
          excerpt?: string;
          tags?: string[];
          hero_image_large?: string | null;
          hero_image_thumbnail?: string | null;
          has_sources?: boolean;
          sources_data?: Array<{
            title: string;
            url: string;
          }>;
          has_notes?: boolean;
          notes_content?: string;
          is_draft?: boolean;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
