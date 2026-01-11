/*
  # Portfolio Projects Database Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key) - Unique project identifier
      - `title` (text) - Project title
      - `type` (text) - Project type (Music Video, Advertisement, etc.)
      - `client_type` (text) - Type of client (Company, Individual)
      - `client_name` (text) - Client name
      - `client_logo` (text) - URL to client logo
      - `date` (date) - Project date
      - `reach_views` (integer) - Total views
      - `reach_channels` (text[]) - Distribution channels
      - `reach_impressions` (integer) - Total impressions
      - `poster` (text) - Project poster image URL
      - `description` (text) - Project description
      - `testimonial_client` (text) - Testimonial client name
      - `testimonial_text` (text) - Testimonial quote
      - `testimonial_role` (text, nullable) - Testimonial client role
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
    
    - `videos`
      - `id` (uuid, primary key) - Unique video identifier
      - `project_id` (uuid, foreign key) - Reference to parent project
      - `title` (text) - Video title
      - `platform` (text) - Platform type (youtube, vimeo, mega, instagram)
      - `link` (text) - Video embed link
      - `order_index` (integer) - Display order
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on both tables
    - Public read access for all users (portfolio is public)
    - Write access only for authenticated users (admin)

  3. Indexes
    - Index on project date for sorting
    - Index on project type for filtering
    - Index on videos.project_id for efficient joins
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL,
  client_type text NOT NULL,
  client_name text NOT NULL,
  client_logo text DEFAULT '',
  date date NOT NULL,
  reach_views integer DEFAULT 0,
  reach_channels text[] DEFAULT '{}',
  reach_impressions integer DEFAULT 0,
  poster text NOT NULL,
  description text NOT NULL,
  testimonial_client text NOT NULL,
  testimonial_text text NOT NULL,
  testimonial_role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('youtube', 'vimeo', 'mega', 'instagram')),
  link text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_date ON projects(date DESC);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
CREATE POLICY "Projects are publicly readable"
  ON projects FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for videos table
CREATE POLICY "Videos are publicly readable"
  ON videos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete videos"
  ON videos FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to projects table
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();