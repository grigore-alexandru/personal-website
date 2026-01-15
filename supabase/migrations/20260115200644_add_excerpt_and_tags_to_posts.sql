/*
  # Add excerpt and tags fields to posts table

  1. Changes
    - Add `excerpt` (text) column to posts table for post summaries
    - Add `tags` (text array) column to posts table for categorization
    - These fields are optional and can be used for SEO and filtering

  2. Migration Details
    - Adds columns with appropriate default values
    - Excerpt defaults to empty string
    - Tags defaults to empty array
*/

-- Add excerpt and tags columns to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'excerpt'
  ) THEN
    ALTER TABLE posts ADD COLUMN excerpt text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'tags'
  ) THEN
    ALTER TABLE posts ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;
