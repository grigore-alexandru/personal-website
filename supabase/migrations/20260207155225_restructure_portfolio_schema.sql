/*
  # Restructure Portfolio Database Schema

  Complete restructure of the portfolio database for proper normalization,
  replacing the old projects/videos tables with a modern, flexible schema.

  1. Lookup Tables
    - `project_types` - 9 project categories (Music Video, Advertisement, etc.)
      - `id` (uuid, primary key)
      - `name` (text, unique) - display name
      - `slug` (text, unique) - URL-safe identifier
      - `created_at` (timestamptz)
    - `content_types` - 2 media categories (Image, Video)
      - `id` (uuid, primary key)
      - `name` (text, unique) - display name
      - `slug` (text, unique) - URL-safe identifier
      - `created_at` (timestamptz)

  2. Redesigned Tables
    - `projects` (replaces old projects table)
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL-friendly project identifier
      - `type_id` (uuid, FK to project_types) - project category
      - `title` (text) - project name
      - `client_name` (text) - brand or client name
      - `client_logo_url` (text, nullable) - client logo
      - `hero_image_large` (text) - high-res hero image
      - `hero_image_thumbnail` (text) - compressed grid thumbnail
      - `description` (jsonb) - TipTap rich text for "About" section
      - `tasks` (text[]) - bullet-point task list
      - `impact_metrics` (jsonb, nullable) - up to 3 metric blocks [{label, value}]
      - `recommendation` (jsonb, nullable) - testimonial {name, role, text}
      - `is_draft` (boolean) - visibility control
      - `created_at` / `updated_at` (timestamptz)
    - `content` (master media library, replaces old videos table)
      - `id` (uuid, primary key)
      - `type_id` (uuid, FK to content_types) - media type
      - `title` (text) - descriptive name
      - `caption` (text, nullable) - optional description
      - `url` (text) - media URL or embed link
      - `platform` (text, nullable) - video platform (youtube, vimeo, mega, instagram)
      - `format` (text) - landscape or portrait
      - `created_at` (timestamptz)
    - `project_content` (junction table)
      - `id` (uuid, primary key)
      - `project_id` (uuid, FK to projects)
      - `content_id` (uuid, FK to content)
      - `order_index` (integer) - display sequence
      - Unique constraint on (project_id, content_id)

  3. Data Migration
    - 14 existing projects migrated with auto-generated slugs
    - Reach metrics converted to impact_metrics JSONB
    - Testimonials converted to recommendation JSONB
    - Descriptions wrapped in TipTap JSON format
    - 23 existing videos migrated to content table
    - Video-project relationships preserved in project_content
    - Old tables preserved as projects_old and videos_old

  4. Security
    - RLS enabled on all 5 new tables
    - Published projects and linked content readable by public
    - All write operations restricted to authenticated users
    - Lookup tables readable by all users

  5. Storage
    - portfolio-images bucket for hero images and content uploads
    - Public read, 5MB limit, JPEG/PNG/GIF/WebP allowed
*/

-- ============================================================
-- STEP 1: Preserve old tables by renaming
-- ============================================================
ALTER TABLE videos RENAME TO videos_old;
ALTER TABLE projects RENAME TO projects_old;

-- ============================================================
-- STEP 2: Create lookup tables
-- ============================================================
CREATE TABLE IF NOT EXISTS project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO project_types (name, slug) VALUES
  ('Advertisement', 'advertisement'),
  ('Competition Entry', 'competition-entry'),
  ('Documentary Short', 'documentary-short'),
  ('Event Highlights', 'event-highlights'),
  ('Music Video', 'music-video'),
  ('Podcast', 'podcast'),
  ('Presentation', 'presentation'),
  ('Trailer', 'trailer'),
  ('Vlog', 'vlog')
ON CONFLICT (name) DO NOTHING;

INSERT INTO content_types (name, slug) VALUES
  ('Image', 'image'),
  ('Video', 'video')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STEP 3: Create new tables
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  type_id uuid NOT NULL REFERENCES project_types(id),
  title text NOT NULL,
  client_name text NOT NULL,
  client_logo_url text,
  hero_image_large text NOT NULL DEFAULT '',
  hero_image_thumbnail text NOT NULL DEFAULT '',
  description jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  tasks text[] DEFAULT '{}',
  impact_metrics jsonb,
  recommendation jsonb,
  is_draft boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id uuid NOT NULL REFERENCES content_types(id),
  title text NOT NULL,
  caption text,
  url text NOT NULL,
  platform text CHECK (platform IN ('youtube', 'vimeo', 'mega', 'instagram')),
  format text NOT NULL DEFAULT 'landscape' CHECK (format IN ('landscape', 'portrait')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  UNIQUE (project_id, content_id)
);

-- ============================================================
-- STEP 4: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_type_id ON projects(type_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_draft ON projects(is_draft);
CREATE INDEX IF NOT EXISTS idx_content_type_id ON content(type_id);
CREATE INDEX IF NOT EXISTS idx_project_content_project_id ON project_content(project_id);
CREATE INDEX IF NOT EXISTS idx_project_content_content_id ON project_content(content_id);
CREATE INDEX IF NOT EXISTS idx_project_content_order ON project_content(project_id, order_index);

-- ============================================================
-- STEP 5: Trigger for updated_at
-- ============================================================
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 6: Enable RLS
-- ============================================================
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_content ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 7: RLS Policies
-- ============================================================

-- project_types (reference data)
CREATE POLICY "Anyone can read project types"
  ON project_types FOR SELECT
  TO anon, authenticated
  USING (slug IS NOT NULL);

CREATE POLICY "Authenticated users can insert project types"
  ON project_types FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update project types"
  ON project_types FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete project types"
  ON project_types FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- content_types (reference data)
CREATE POLICY "Anyone can read content types"
  ON content_types FOR SELECT
  TO anon, authenticated
  USING (slug IS NOT NULL);

CREATE POLICY "Authenticated users can insert content types"
  ON content_types FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update content types"
  ON content_types FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete content types"
  ON content_types FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- projects
CREATE POLICY "Public can read published projects"
  ON projects FOR SELECT
  TO anon
  USING (is_draft = false);

CREATE POLICY "Authenticated users can read all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- content
CREATE POLICY "Public can read content linked to published projects"
  ON content FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM project_content pc
      JOIN projects p ON p.id = pc.project_id
      WHERE pc.content_id = content.id
      AND p.is_draft = false
    )
  );

CREATE POLICY "Authenticated users can read all content"
  ON content FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create content"
  ON content FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update content"
  ON content FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete content"
  ON content FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- project_content
CREATE POLICY "Public can read content links for published projects"
  ON project_content FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_content.project_id
      AND projects.is_draft = false
    )
  );

CREATE POLICY "Authenticated users can read all project content links"
  ON project_content FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create project content links"
  ON project_content FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update project content links"
  ON project_content FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete project content links"
  ON project_content FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 8: Migrate existing projects data
-- ============================================================
INSERT INTO projects (
  id, slug, type_id, title, client_name, client_logo_url,
  hero_image_large, hero_image_thumbnail,
  description, tasks, impact_metrics, recommendation,
  is_draft, created_at, updated_at
)
SELECT
  po.id,
  trim(both '-' from lower(regexp_replace(regexp_replace(regexp_replace(
    po.title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'),
    '-{2,}', '-', 'g'))),
  pt.id,
  po.title,
  po.client_name,
  NULLIF(po.client_logo, ''),
  po.poster,
  po.poster,
  jsonb_build_object(
    'type', 'doc',
    'content', jsonb_build_array(
      jsonb_build_object(
        'type', 'paragraph',
        'content', jsonb_build_array(
          jsonb_build_object('type', 'text', 'text', po.description)
        )
      )
    )
  ),
  '{}',
  (
    SELECT jsonb_agg(metric ORDER BY idx) FROM (
      SELECT 1 AS idx, jsonb_build_object('label', 'Views', 'value',
        CASE
          WHEN po.reach_views >= 1000000 THEN round(po.reach_views::numeric / 1000000, 2)::text || 'M'
          WHEN po.reach_views >= 1000 THEN (po.reach_views / 1000)::text || 'K'
          ELSE po.reach_views::text
        END
      ) AS metric
      WHERE po.reach_views IS NOT NULL AND po.reach_views > 0
      UNION ALL
      SELECT 2, jsonb_build_object('label', 'Impressions', 'value',
        CASE
          WHEN po.reach_impressions >= 1000000 THEN round(po.reach_impressions::numeric / 1000000, 2)::text || 'M'
          WHEN po.reach_impressions >= 1000 THEN (po.reach_impressions / 1000)::text || 'K'
          ELSE po.reach_impressions::text
        END
      )
      WHERE po.reach_impressions IS NOT NULL AND po.reach_impressions > 0
      UNION ALL
      SELECT 3, jsonb_build_object('label', 'Channels', 'value',
        array_to_string(po.reach_channels, ', ')
      )
      WHERE po.reach_channels IS NOT NULL AND array_length(po.reach_channels, 1) > 0
    ) sub
  ),
  CASE
    WHEN po.testimonial_client IS NOT NULL AND po.testimonial_text IS NOT NULL AND po.testimonial_text != ''
    THEN jsonb_build_object(
      'name', po.testimonial_client,
      'role', COALESCE(po.testimonial_role, ''),
      'text', jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
              jsonb_build_object('type', 'text', 'text', po.testimonial_text)
            )
          )
        )
      )
    )
    ELSE NULL
  END,
  false,
  po.created_at,
  po.updated_at
FROM projects_old po
JOIN project_types pt ON pt.name = po.type;

-- ============================================================
-- STEP 9: Migrate existing videos to content table
-- ============================================================
INSERT INTO content (id, type_id, title, caption, url, platform, format, created_at)
SELECT
  vo.id,
  ct.id,
  vo.title,
  NULL,
  vo.link,
  vo.platform,
  'landscape',
  vo.created_at
FROM videos_old vo
CROSS JOIN content_types ct
WHERE ct.slug = 'video';

-- ============================================================
-- STEP 10: Create project_content junction entries
-- ============================================================
INSERT INTO project_content (project_id, content_id, order_index)
SELECT vo.project_id, vo.id, vo.order_index
FROM videos_old vo;

-- ============================================================
-- STEP 11: Create portfolio-images storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];