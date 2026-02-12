/*
  # Add Content Management System Fields

  Complete enhancement of the content table to support standalone content pages,
  content management, ordering, and rich metadata.

  1. New Columns Added to `content` Table
    - `slug` (text, UNIQUE, NOT NULL) - URL-friendly identifier for /portfolio/videos/{slug}
    - `is_draft` (boolean, DEFAULT false) - draft/published toggle for content visibility
    - `order_index` (integer, DEFAULT 0) - global display order for content grid, controlled by admin drag-and-drop
    - `contributors` (jsonb, NULLABLE) - array of contributor objects [{name: string, role: string}]; null when not applicable
    - `published_at` (timestamptz, DEFAULT now()) - publication date, displayed as "Year" on detail views
    - `updated_at` (timestamptz, DEFAULT now()) - last modification timestamp

  2. Thumbnail Column Documentation Update
    The existing `thumbnail` jsonb column now supports two structures:
    - For video content: {"poster": "url_to_first_frame", "video": "url_to_compressed_short_video"}
    - For image content: {"compressed": "url_to_heavily_compressed_thumbnail"}
    
  3. Indexes
    - Index on `slug` for fast content lookup by URL
    - Index on `order_index` for efficient ordered retrieval
    - Index on `is_draft` for filtering published vs draft content

  4. RLS Policy Updates
    - Anonymous users can now SELECT content where `is_draft = false` (independent of project association)
    - Authenticated users retain full CRUD access to all content

  5. Data Migration
    - Set `is_draft = false` for all existing content rows to maintain visibility
    - Generate unique slugs for existing content based on title
    - Set `order_index` based on creation order

  6. Updated Trigger
    - Add `updated_at` trigger to content table

  7. Storage Bucket
    - Create `content-media` bucket for video thumbnails, poster frames, and image thumbnails
    - Public read access, 7MB file size limit
    - Supports JPEG, PNG, WebP, MP4, WebM formats
*/

-- ============================================================
-- STEP 1: Add new columns to content table
-- ============================================================

-- Add slug column (will be populated before making it NOT NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'slug'
  ) THEN
    ALTER TABLE content ADD COLUMN slug text;
  END IF;
END $$;

-- Add is_draft column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE content ADD COLUMN is_draft boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add order_index column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE content ADD COLUMN order_index integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add contributors column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'contributors'
  ) THEN
    ALTER TABLE content ADD COLUMN contributors jsonb;
  END IF;
END $$;

-- Add published_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE content ADD COLUMN published_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE content ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ============================================================
-- STEP 2: Generate slugs for existing content
-- ============================================================

-- Generate unique slugs from titles for existing rows without slugs
UPDATE content
SET slug = CONCAT(
  trim(both '-' from lower(regexp_replace(regexp_replace(regexp_replace(
    title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'),
    '-{2,}', '-', 'g'))),
  '-',
  substr(id::text, 1, 8)
)
WHERE slug IS NULL;

-- Make slug NOT NULL and UNIQUE after populating
ALTER TABLE content ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_slug_unique ON content(slug);

-- ============================================================
-- STEP 3: Set order_index based on creation order
-- ============================================================

WITH ordered_content AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS new_order
  FROM content
)
UPDATE content
SET order_index = ordered_content.new_order
FROM ordered_content
WHERE content.id = ordered_content.id;

-- ============================================================
-- STEP 4: Update thumbnail column documentation
-- ============================================================

COMMENT ON COLUMN content.thumbnail IS 'Thumbnail data structure varies by content type. For videos: {"poster": "url", "video": "url"}. For images: {"compressed": "url"}. Used for grid display and hover previews.';

-- ============================================================
-- STEP 5: Create indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_content_slug ON content(slug);
CREATE INDEX IF NOT EXISTS idx_content_order_index ON content(order_index);
CREATE INDEX IF NOT EXISTS idx_content_is_draft ON content(is_draft);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at DESC);

-- ============================================================
-- STEP 6: Add updated_at trigger
-- ============================================================

CREATE TRIGGER set_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 7: Update RLS policies for content
-- ============================================================

-- Drop the old anon policy that required project association
DROP POLICY IF EXISTS "Public can read content linked to published projects" ON content;

-- Create new anon policy that allows reading published content directly
CREATE POLICY "Public can read published content"
  ON content FOR SELECT
  TO anon
  USING (is_draft = false);

-- Ensure authenticated users can still read all content (policy should already exist)
-- This is a safety check in case the policy doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'content' 
    AND policyname = 'Authenticated users can read all content'
  ) THEN
    CREATE POLICY "Authenticated users can read all content"
      ON content FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================================
-- STEP 8: Create content-media storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-media',
  'content-media',
  true,
  7340032,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 7340032,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

-- ============================================================
-- STEP 9: RLS policies for content-media bucket
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read content-media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to content-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update content-media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from content-media" ON storage.objects;

-- Public read access
CREATE POLICY "Public can read content-media files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'content-media');

-- Authenticated write access
CREATE POLICY "Authenticated users can upload to content-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'content-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update content-media files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'content-media' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'content-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete from content-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'content-media' AND auth.uid() IS NOT NULL);
