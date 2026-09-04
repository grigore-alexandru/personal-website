/*
  # Stop anonymous visitors reading draft posts

  ## Problem
  The original blog migration created:

      CREATE POLICY "Posts are publicly readable"
        ON posts FOR SELECT TO anon, authenticated
        USING (true);

  The March 2026 RLS hardening pass (20260315111131) dropped the four
  "Authenticated users can ..." policies on `posts` but left that one in place.
  Combined with `loadPost()` having no `is_draft` filter — unlike every other
  loader in the project — anyone who guessed or scraped a draft slug could read
  and render the full unpublished post at /blog/<slug>.

  `documents` already models this correctly with
  `USING (access_level = 'public')`; this brings `posts` in line.

  ## Change
  Replace the blanket anon read with one scoped to published rows. Admins keep
  full read access through the separate "Admins can view all posts" policy added
  by the hardening migration, so the editor is unaffected.

  ## Note
  `loadPost()` gained a matching `.eq('is_draft', false)` in the same change.
  That is defence in depth — this policy is the actual boundary.
*/

DROP POLICY IF EXISTS "Posts are publicly readable" ON posts;

CREATE POLICY "Published posts are publicly readable"
  ON posts FOR SELECT
  TO anon, authenticated
  USING (is_draft = false);
