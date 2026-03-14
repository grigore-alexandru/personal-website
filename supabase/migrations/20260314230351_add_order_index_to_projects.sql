/*
  # Add order_index to projects table

  ## Summary
  Adds a customizable display order to the projects table so the admin can control
  the sequence in which portfolio projects appear publicly.

  ## Changes

  ### Modified Tables
  - `projects`
    - New column: `order_index` (integer, NOT NULL, default 0)
      - Controls the display sequence of projects in the public portfolio
      - Higher values appear first (descending order)

  ## Data Migration
  Back-fills all existing projects with sequential order values based on their
  current `created_at DESC` ordering, so the newest project receives the highest
  index and continues to appear first — preserving the existing public display order.

  ## Performance
  - New index `idx_projects_order_index` on `(order_index DESC)` for efficient
    ORDER BY queries, matching the index strategy already used for the content table.

  ## Notes
  1. The column defaults to 0 so any future inserts that omit it are safe.
  2. The back-fill uses ROW_NUMBER() with the same pattern as the existing
     content order migration (20260314214322).
  3. No RLS changes — this column is part of the existing projects table which
     already has RLS policies applied.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE projects ADD COLUMN order_index integer NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE projects
SET order_index = sub.new_index
FROM (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1) AS new_index
  FROM projects
) sub
WHERE projects.id = sub.id;

CREATE INDEX IF NOT EXISTS idx_projects_order_index ON projects (order_index DESC);
