export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          title: string;
          type: string;
          client_type: string;
          client_name: string;
          client_logo: string;
          date: string;
          reach_views: number;
          reach_channels: string[];
          reach_impressions: number;
          poster: string;
          description: string;
          testimonial_client: string;
          testimonial_text: string;
          testimonial_role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: string;
          client_type: string;
          client_name: string;
          client_logo?: string;
          date: string;
          reach_views?: number;
          reach_channels?: string[];
          reach_impressions?: number;
          poster: string;
          description: string;
          testimonial_client: string;
          testimonial_text: string;
          testimonial_role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: string;
          client_type?: string;
          client_name?: string;
          client_logo?: string;
          date?: string;
          reach_views?: number;
          reach_channels?: string[];
          reach_impressions?: number;
          poster?: string;
          description?: string;
          testimonial_client?: string;
          testimonial_text?: string;
          testimonial_role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          platform: 'youtube' | 'vimeo' | 'mega' | 'instagram';
          link: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          platform: 'youtube' | 'vimeo' | 'mega' | 'instagram';
          link: string;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          platform?: 'youtube' | 'vimeo' | 'mega' | 'instagram';
          link?: string;
          order_index?: number;
          created_at?: string;
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
