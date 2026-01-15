/*
  # Update Blog Posts Schema for TipTap

  1. Changes
    - Drop hero_image_url column (no longer needed)
    - content column already JSONB (perfect for TipTap JSON)
    - Keep has_sources, sources_data, has_notes, notes_content unchanged
  
  2. Notes
    - This migration removes hero image support in favor of inline images
    - All images will now be managed through TipTap content
    - Content will store TipTap JSON format
*/

-- Drop hero_image_url column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'hero_image_url'
  ) THEN
    ALTER TABLE blog_posts DROP COLUMN hero_image_url;
  END IF;
END $$;