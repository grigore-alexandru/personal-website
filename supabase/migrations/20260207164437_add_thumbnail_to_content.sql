/*
  # Add thumbnail column to content table

  1. Modified Tables
    - `content`
      - `thumbnail` (jsonb, nullable) - stores thumbnail image and animated gif for video content
        - Structure: {"thum_image": "url", "thum_gif": "url"}
        - Only applicable for video content types
        - Used in listings/previews, not on detail pages

  2. Notes
    - Column is nullable since images and existing videos may not have thumbnails yet
    - No data migration needed; thumbnails will be populated as content is updated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'thumbnail'
  ) THEN
    ALTER TABLE content ADD COLUMN thumbnail jsonb;
  END IF;
END $$;

COMMENT ON COLUMN content.thumbnail IS 'Video thumbnail data: {"thum_image": "url", "thum_gif": "url"}. Only used for video content types. Displayed in listings/previews, hidden from detail page.';