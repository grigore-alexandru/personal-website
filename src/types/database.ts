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
          thumbnail: { poster: string; hover_video: string } | { poster: string } | null;
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
          thumbnail?: { poster: string; hover_video: string } | { poster: string } | null;
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
          thumbnail?: { poster: string; hover_video: string } | { poster: string } | null;
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
      links: {
        Row: {
          id: string;
          name: string;
          slug: string;
          destination_url: string;
          description: string | null;
          status: 'active' | 'paused' | 'archived';
          expires_at: string | null;
          max_clicks: number | null;
          click_count: number;
          interstitial_enabled: boolean;
          interstitial_code: string | null;
          interstitial_fallback_seconds: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          destination_url: string;
          description?: string | null;
          status?: 'active' | 'paused' | 'archived';
          expires_at?: string | null;
          max_clicks?: number | null;
          click_count?: number;
          interstitial_enabled?: boolean;
          interstitial_code?: string | null;
          interstitial_fallback_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          destination_url?: string;
          description?: string | null;
          status?: 'active' | 'paused' | 'archived';
          expires_at?: string | null;
          max_clicks?: number | null;
          click_count?: number;
          interstitial_enabled?: boolean;
          interstitial_code?: string | null;
          interstitial_fallback_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      link_destination_history: {
        Row: {
          id: string;
          link_id: string;
          old_destination_url: string;
          changed_at: string;
        };
        Insert: {
          id?: string;
          link_id: string;
          old_destination_url: string;
          changed_at?: string;
        };
        Update: {
          id?: string;
          link_id?: string;
          old_destination_url?: string;
          changed_at?: string;
        };
      };
      link_clicks: {
        Row: {
          id: string;
          link_id: string;
          clicked_at: string;
          referrer_domain: string | null;
          device_type: 'mobile' | 'desktop' | 'tablet' | null;
          visitor_hash: string | null;
        };
        Insert: {
          id?: string;
          link_id: string;
          clicked_at?: string;
          referrer_domain?: string | null;
          device_type?: 'mobile' | 'desktop' | 'tablet' | null;
          visitor_hash?: string | null;
        };
        Update: {
          id?: string;
          link_id?: string;
          clicked_at?: string;
          referrer_domain?: string | null;
          device_type?: 'mobile' | 'desktop' | 'tablet' | null;
          visitor_hash?: string | null;
        };
      };
    };
  };
}
