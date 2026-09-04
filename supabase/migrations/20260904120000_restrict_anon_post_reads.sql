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

  ## Production already had this
  The live database was hardened on 2026-02-18 by
  `fix_mutable_search_path_and_rls_always_true`, which is one of five
  migrations present in the remote project but never committed here. So this
  file changes nothing in production; it exists so that a database rebuilt from
  this repo alone is not left with the original `USING (true)` policy.

  Written to be idempotent for that reason — the DROP/CREATE pair runs inside a
  single transaction, so there is no window where the table is unprotected.
*/

DROP POLICY IF EXISTS "Posts are publicly readable" ON posts;
DROP POLICY IF EXISTS "Published posts are publicly readable" ON posts;

CREATE POLICY "Published posts are publicly readable"
  ON posts FOR SELECT
  TO anon, authenticated
  USING (is_draft = false);
