/*
  # PDF Documents

  ## Summary
  Adds the `documents` table backing `alexandrugrigore.com/documents/<slug>` —
  publicly viewable PDF documents with a generated page-1 thumbnail used as the
  social-preview (og:image) card.

  ## Security
  RLS is enabled. Writes are admin-only, exactly like `links` / `posts` /
  `projects` / `content`. Unlike `links`, documents also get ONE direct public
  SELECT policy: there is no click-counting, rate-limiting, or interstitial
  logic here that would require a SECURITY DEFINER gate, so a straightforward
  public-read policy is the simplest correct approach — anon and authenticated
  visitors alike need to read a document's row to render the page and its
  metadata.

  ## access_level (forward-compatible, public-only for now)
  A future feature will let some documents be password-protected. Rather than
  bolt that on later as an RLS rewrite, the public SELECT policy is already
  scoped to `access_level = 'public'` — every row is 'public' today, so this
  changes nothing in practice, but a future password-gated row is
  automatically invisible to this policy without touching it again. Building
  the actual password gate (hash column, verification route, and a shift away
  from a directly-fetchable public file URL) is out of scope here.

  ## Storage
  This table stores full public Mega S4 URLs only (file_url, thumbnail_url) —
  the same convention as `content.thumbnail_url` elsewhere in this schema.
  Actual bytes live in the `documents` Mega S4 bucket under deterministic keys
  (`docs/<slug>.pdf`, `thumb/<slug>.webp`), so replacing a file is an
  overwrite-in-place PUT to the same key. No version history table —
  cache-busting is done at render time via `?v=<updated_at>`, never stored.

  ## Revalidation
  `trigger_revalidate()` already exists (see the `posts` / `projects` /
  `content` triggers) and POSTs {table, type, record} to
  /api/revalidate on every row change. Wiring `documents` into it the same
  way means any write path — the interim admin page, the future full admin
  UI, or a raw SQL edit — busts the static page automatically, with nothing
  for application code to remember to call.
*/

CREATE TABLE IF NOT EXISTS documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  title            text NOT NULL,
  description      text,
  file_url         text NOT NULL,
  thumbnail_url    text,
  file_size_bytes  bigint,
  page_count       integer,
  tags             text[],
  access_level     text NOT NULL DEFAULT 'public',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT documents_slug_format
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 64),
  CONSTRAINT documents_title_length
    CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT documents_description_length
    CHECK (description IS NULL OR char_length(description) <= 300),
  CONSTRAINT documents_file_size_positive
    CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  CONSTRAINT documents_page_count_positive
    CHECK (page_count IS NULL OR page_count > 0),
  CONSTRAINT documents_access_level_valid
    CHECK (access_level IN ('public', 'password'))
);

CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents (created_at DESC);
CREATE INDEX IF NOT EXISTS documents_tags_idx        ON documents USING gin (tags);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can view a published, public document by slug, no auth needed.
CREATE POLICY "Anyone can read public documents"
  ON documents FOR SELECT TO anon, authenticated
  USING (access_level = 'public');

CREATE POLICY "Admins can read all documents"
  ON documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can create documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can update documents"
  ON documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE OR REPLACE FUNCTION touch_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_documents_updated_at ON documents;
CREATE TRIGGER trg_touch_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION touch_documents_updated_at();

-- Reuses the existing trigger_revalidate() function (see posts/projects/content)
-- to POST {table:'documents', type, record} to /api/revalidate on every
-- change, so the static /documents/[slug] page busts automatically.
DROP TRIGGER IF EXISTS revalidate_on_documents_change ON documents;
CREATE TRIGGER revalidate_on_documents_change
  AFTER INSERT OR DELETE OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_revalidate();
