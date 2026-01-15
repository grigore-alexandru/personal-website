/*
  # Create blog posts table

  1. New Tables
    - `posts`
      - `id` (uuid, primary key) - Unique post identifier
      - `title` (text) - Blog post title
      - `slug` (text, unique) - SEO-friendly URL slug
      - `hero_image_url` (text) - Full-width hero image URL
      - `content` (jsonb) - Array of content blocks with type and data
      - `has_sources` (boolean) - Whether to show sources section
      - `sources_data` (jsonb) - Array of source objects (title, url)
      - `has_notes` (boolean) - Whether to show notes section
      - `notes_content` (text) - Content for notes section
      - `published_at` (timestamptz) - Publication date and time
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on posts table
    - Public read access for all users
    - Write access only for authenticated users (admin)

  3. Indexes
    - Index on slug for efficient lookups
    - Index on published_at for sorting by date
*/

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  hero_image_url text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  has_sources boolean DEFAULT false,
  sources_data jsonb DEFAULT '[]'::jsonb,
  has_notes boolean DEFAULT false,
  notes_content text DEFAULT '',
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts table
CREATE POLICY "Posts are publicly readable"
  ON posts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete posts"
  ON posts FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();