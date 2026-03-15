/*
  # Phase 3: RLS Policy Hardening & URL CHECK Constraints

  ## Summary
  This migration tightens write-access security, introduces a profiles table for
  explicit admin role tracking, fixes a legacy over-permissive SELECT policy on
  posts, and adds database-level CHECK constraints to reject javascript: URI schemes
  on all URL columns.

  ## 1. New Tables
  - `profiles`
    - `id` (uuid, PK, FK → auth.users.id)
    - `is_admin` (boolean, default false)
    - `created_at` (timestamptz)
  - Seeded with the single existing admin user (is_admin = true)

  ## 2. Modified RLS Policies

  ### posts
  - DROP legacy "Authenticated users can view all posts" (qual: true — too loose)
  - ADD new SELECT for authenticated: only when profiles.is_admin = true
  - REPLACE INSERT / UPDATE / DELETE policies with is_admin check

  ### projects
  - REPLACE INSERT / UPDATE / DELETE SELECT (authenticated) with is_admin check

  ### content
  - REPLACE INSERT / UPDATE / DELETE SELECT (authenticated) with is_admin check

  ### project_content
  - REPLACE INSERT / UPDATE / DELETE SELECT (authenticated) with is_admin check

  ### project_types / content_types (lookup tables)
  - REPLACE INSERT / UPDATE / DELETE with is_admin check

  ## 3. Security
  - RLS enabled on profiles
  - Admins can read/update their own profile
  - No policy allows non-admins to set is_admin = true

  ## 4. URL CHECK Constraints
  Rejects any value starting with 'javascript:' (case-insensitive) on:
  - content.url
  - posts.hero_image_large
  - posts.hero_image_thumbnail
  - projects.client_logo_url
  - projects.hero_image_large
  - projects.hero_image_thumbnail

  ## Important Notes
  1. The profiles table is the authoritative source for admin status.
  2. All existing authenticated-only write policies are replaced — not just augmented.
  3. The loose legacy posts SELECT policy (qual = true for authenticated) is dropped.
  4. URL constraints use a ILIKE exclusion pattern to be case-insensitive.
*/

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Seed the existing admin user
INSERT INTO profiles (id, is_admin)
SELECT id, true FROM auth.users
ON CONFLICT (id) DO UPDATE SET is_admin = true;

-- Admins can read their own profile
CREATE POLICY "Admins can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can update own profile but cannot self-elevate is_admin
CREATE POLICY "Admins can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- Helper: reusable admin check inline expression
-- (used in all policies below as a subquery)
-- ============================================================

-- ============================================================
-- 2. POSTS — drop legacy loose policy, add is_admin-gated ones
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view all posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON posts;

CREATE POLICY "Admins can view all posts"
  ON posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can insert posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete posts"
  ON posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================================
-- 3. PROJECTS — replace auth.role() checks with is_admin
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read all projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

CREATE POLICY "Admins can read all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================================
-- 4. CONTENT — replace auth.role() checks with is_admin
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read all content" ON content;
DROP POLICY IF EXISTS "Authenticated users can create content" ON content;
DROP POLICY IF EXISTS "Authenticated users can update content" ON content;
DROP POLICY IF EXISTS "Authenticated users can delete content" ON content;

CREATE POLICY "Admins can read all content"
  ON content FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can create content"
  ON content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update content"
  ON content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete content"
  ON content FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================================
-- 5. PROJECT_CONTENT — replace auth.role() checks with is_admin
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read all project content links" ON project_content;
DROP POLICY IF EXISTS "Authenticated users can create project content links" ON project_content;
DROP POLICY IF EXISTS "Authenticated users can update project content links" ON project_content;
DROP POLICY IF EXISTS "Authenticated users can delete project content links" ON project_content;

CREATE POLICY "Admins can read all project content links"
  ON project_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can create project content links"
  ON project_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update project content links"
  ON project_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete project content links"
  ON project_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================================
-- 6. PROJECT_TYPES — replace auth.role() checks with is_admin
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert project types" ON project_types;
DROP POLICY IF EXISTS "Authenticated users can update project types" ON project_types;
DROP POLICY IF EXISTS "Authenticated users can delete project types" ON project_types;

CREATE POLICY "Admins can insert project types"
  ON project_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update project types"
  ON project_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete project types"
  ON project_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================================
-- 7. CONTENT_TYPES — replace auth.role() checks with is_admin
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert content types" ON content_types;
DROP POLICY IF EXISTS "Authenticated users can update content types" ON content_types;
DROP POLICY IF EXISTS "Authenticated users can delete content types" ON content_types;

CREATE POLICY "Admins can insert content types"
  ON content_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update content types"
  ON content_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete content types"
  ON content_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================================
-- 8. URL CHECK CONSTRAINTS (reject javascript: URI scheme)
-- ============================================================

ALTER TABLE content
  ADD CONSTRAINT chk_content_url_no_js
    CHECK (url IS NULL OR url NOT ILIKE 'javascript:%');

ALTER TABLE posts
  ADD CONSTRAINT chk_posts_hero_large_no_js
    CHECK (hero_image_large IS NULL OR hero_image_large NOT ILIKE 'javascript:%');

ALTER TABLE posts
  ADD CONSTRAINT chk_posts_hero_thumbnail_no_js
    CHECK (hero_image_thumbnail IS NULL OR hero_image_thumbnail NOT ILIKE 'javascript:%');

ALTER TABLE projects
  ADD CONSTRAINT chk_projects_client_logo_no_js
    CHECK (client_logo_url IS NULL OR client_logo_url NOT ILIKE 'javascript:%');

ALTER TABLE projects
  ADD CONSTRAINT chk_projects_hero_large_no_js
    CHECK (hero_image_large IS NULL OR hero_image_large NOT ILIKE 'javascript:%');

ALTER TABLE projects
  ADD CONSTRAINT chk_projects_hero_thumbnail_no_js
    CHECK (hero_image_thumbnail IS NULL OR hero_image_thumbnail NOT ILIKE 'javascript:%');
