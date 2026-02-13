/*
  # Add Performance Indexes

  This migration adds indexes to frequently queried fields across all tables
  to significantly improve query performance and reduce database load.

  ## Changes

  1. Posts Table Indexes
    - Add index on `slug` for fast slug-based lookups
    - Add index on `is_draft` for filtering published posts
    - Add index on `published_at` for chronological sorting
    - Add composite index on `(is_draft, published_at)` for optimized listing queries

  2. Projects Table Indexes
    - Add index on `slug` for fast slug-based lookups
    - Add index on `is_draft` for filtering published projects
    - Add index on `created_at` for chronological sorting
    - Add composite index on `(is_draft, created_at)` for optimized listing queries
    - Add index on `type_id` for filtering by project type

  3. Content Table Indexes
    - Add index on `slug` for fast slug-based lookups
    - Add index on `is_draft` for filtering published content
    - Add index on `order_index` for sorting content items
    - Add index on `type_id` for filtering by content type
    - Add composite index on `(is_draft, order_index)` for optimized listing queries

  4. Project Content Junction Table Indexes
    - Add composite index on `(project_id, order_index)` for optimized content retrieval

  ## Performance Impact

  These indexes will significantly improve:
  - Slug-based lookups (detail pages)
  - Filtered list queries (published vs draft)
  - Chronological sorting operations
  - Type-based filtering
  - Content ordering within projects
*/

-- Posts table indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'posts'
    AND indexname = 'idx_posts_slug'
  ) THEN
    CREATE INDEX idx_posts_slug ON posts(slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'posts'
    AND indexname = 'idx_posts_is_draft'
  ) THEN
    CREATE INDEX idx_posts_is_draft ON posts(is_draft);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'posts'
    AND indexname = 'idx_posts_published_at'
  ) THEN
    CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'posts'
    AND indexname = 'idx_posts_draft_published'
  ) THEN
    CREATE INDEX idx_posts_draft_published ON posts(is_draft, published_at DESC);
  END IF;
END $$;

-- Projects table indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND indexname = 'idx_projects_slug'
  ) THEN
    CREATE INDEX idx_projects_slug ON projects(slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND indexname = 'idx_projects_is_draft'
  ) THEN
    CREATE INDEX idx_projects_is_draft ON projects(is_draft);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND indexname = 'idx_projects_created_at'
  ) THEN
    CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND indexname = 'idx_projects_draft_created'
  ) THEN
    CREATE INDEX idx_projects_draft_created ON projects(is_draft, created_at DESC);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND indexname = 'idx_projects_type_id'
  ) THEN
    CREATE INDEX idx_projects_type_id ON projects(type_id);
  END IF;
END $$;

-- Content table indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'content'
    AND indexname = 'idx_content_slug'
  ) THEN
    CREATE INDEX idx_content_slug ON content(slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'content'
    AND indexname = 'idx_content_is_draft'
  ) THEN
    CREATE INDEX idx_content_is_draft ON content(is_draft);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'content'
    AND indexname = 'idx_content_order_index'
  ) THEN
    CREATE INDEX idx_content_order_index ON content(order_index ASC);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'content'
    AND indexname = 'idx_content_type_id'
  ) THEN
    CREATE INDEX idx_content_type_id ON content(type_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'content'
    AND indexname = 'idx_content_draft_order'
  ) THEN
    CREATE INDEX idx_content_draft_order ON content(is_draft, order_index ASC);
  END IF;
END $$;

-- Project Content junction table indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'project_content'
    AND indexname = 'idx_project_content_project_order'
  ) THEN
    CREATE INDEX idx_project_content_project_order ON project_content(project_id, order_index ASC);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'project_content'
    AND indexname = 'idx_project_content_content_id'
  ) THEN
    CREATE INDEX idx_project_content_content_id ON project_content(content_id);
  END IF;
END $$;
