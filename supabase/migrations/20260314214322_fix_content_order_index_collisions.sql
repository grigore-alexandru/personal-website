/*
  # Fix content order_index collisions

  ## Problem
  Multiple content rows share order_index = 0, causing display bugs.
  Ten items were inserted without a proper order_index and all defaulted to 0.

  ## Solution
  Re-sequence ALL content rows using ROW_NUMBER() ordered by:
    1. The existing order_index (preserves intentional ordering for items with index > 0)
    2. created_at ASC as a tiebreaker (oldest colliding items get lower numbers)

  This produces a clean, gapless 0, 1, 2, 3... sequence across the entire table.
  The newest items (highest created_at among those stuck at 0) will naturally
  end up with higher indices, consistent with the "latest added = last" goal.
*/

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY order_index ASC, created_at ASC) - 1) AS new_index
  FROM content
)
UPDATE content
SET order_index = ranked.new_index
FROM ranked
WHERE content.id = ranked.id;
