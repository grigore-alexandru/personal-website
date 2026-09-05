/*
  # Documents: active/inactive toggle + file_type

  ## Summary
  Two additions to `documents` for the admin panel's CRUD feature set:

  1. `is_active` — lets a document be unpublished without deleting it. An
     inactive document 404s on the public route and disappears from the
     sitemap, exactly like a non-'public' access_level does today, but stays
     fully intact in the admin list so it can be reactivated later. The
     public SELECT policy is extended (not replaced with a second policy) to
     require both conditions.

  2. `file_type` — schema/UI prep for an eventual DOCX upload path. Every
     existing row is a PDF (the only format ever uploadable), so this
     defaults to 'pdf' and stays that way until a DOCX upload flow actually
     exists — this migration adds no new capability by itself, it just gives
     the admin UI something honest to render a format badge from.

  ## Security
  No RLS shape change beyond tightening the existing public-read policy's
  USING clause — writes are still gated exactly as before.
*/

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS file_type text NOT NULL DEFAULT 'pdf';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_file_type_valid'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_file_type_valid
        CHECK (file_type IN ('pdf', 'docx'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can read public documents" ON documents;
CREATE POLICY "Anyone can read public documents"
  ON documents FOR SELECT TO anon, authenticated
  USING (access_level = 'public' AND is_active = true);
