/*
  # Add Hero Images to Blog Posts

  1. Schema Changes
    - Add `hero_image_large` column to `posts` table
      - Type: text (URL to full-size hero image)
      - Nullable: true (optional for existing posts and drafts)
      - Description: Full-size hero image displayed on blog post detail page (max 5MB)
    - Add `hero_image_thumbnail` column to `posts` table
      - Type: text (URL to compressed thumbnail)
      - Nullable: true (optional for existing posts and drafts)
      - Description: Compressed thumbnail used in blog list cards

  2. Notes
    - Both columns are nullable to support existing posts without images
    - Hero images are optional for drafts but should be required for published posts (enforced at application level)
    - Images are stored in Supabase storage bucket 'blog-images'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'hero_image_large'
  ) THEN
    ALTER TABLE posts ADD COLUMN hero_image_large text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'hero_image_thumbnail'
  ) THEN
    ALTER TABLE posts ADD COLUMN hero_image_thumbnail text;
  END IF;
END $$;