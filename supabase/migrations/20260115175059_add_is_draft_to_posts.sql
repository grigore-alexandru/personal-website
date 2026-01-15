/*
  # Add is_draft field to posts table

  1. Changes
    - Add `is_draft` (boolean) column to posts table with default value true
    - This allows admins to save posts as drafts before publishing
    - Existing posts will be marked as published (is_draft = false)

  2. Migration Details
    - Adds column with default value true for new posts
    - Updates existing posts to is_draft = false (assumes existing posts are published)
    - Updates RLS policy to only show published posts to anonymous users
*/

-- Add is_draft column to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_draft boolean DEFAULT true;
  END IF;
END $$;

-- Update existing posts to be published (not drafts)
UPDATE posts SET is_draft = false WHERE is_draft IS NULL;

-- Drop existing public read policy
DROP POLICY IF EXISTS "Posts are publicly readable" ON posts;

-- Create new policy that only shows published posts to anonymous users
CREATE POLICY "Published posts are publicly readable"
  ON posts FOR SELECT
  TO anon
  USING (is_draft = false);

-- Authenticated users can see all posts (including drafts)
CREATE POLICY "Authenticated users can view all posts"
  ON posts FOR SELECT
  TO authenticated
  USING (true);
