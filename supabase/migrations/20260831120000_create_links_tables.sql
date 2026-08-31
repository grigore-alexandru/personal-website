/*
  # Link Redirector & Interstitial System

  ## Summary
  Adds the short-link system backing `alexandrugrigore.com/r/<slug>`: link
  records, an append-only destination-change log, and a click-event table used
  only to compute aggregates.

  ## 1. New Tables
  - `links`                       — the short links themselves
  - `link_destination_history`    — trigger-populated, append-only
  - `link_clicks`                 — raw click events (never rendered as a table)

  ## 2. Security
  RLS is enabled on all three tables and EVERY policy requires
  profiles.is_admin = true, consistent with posts / projects / content.

  The public redirect route never touches these tables directly. Anonymous
  visitors reach exactly one entry point: register_click(), a SECURITY DEFINER
  function with a pinned search_path that anon may EXECUTE and nothing else.

  ## 3. Functions
  - `register_click(slug, referrer, device, visitor_hash)` — SECURITY DEFINER.
    Atomically resolves a slug, enforces status/expiry/click-limit, auto-pauses,
    logs the click, increments the counter, and returns only the fields the
    redirect needs. Takes a FOR UPDATE row lock so concurrent scans cannot lose
    counts or overshoot max_clicks.
  - `get_link_stats(link_id)` — SECURITY INVOKER, so admin RLS applies. Returns
    one JSON payload of aggregates including a zero-filled 30-day series.

  ## 4. Privacy
  link_clicks.visitor_hash is a salted daily SHA-256 computed in the Next.js
  route. No raw IP address is ever persisted, and the hash rotates daily so it
  cannot be correlated across days. It exists solely to count unique clicks.
*/

-- ============================================================
-- 1. LINKS
-- ============================================================

CREATE TABLE IF NOT EXISTS links (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                          text NOT NULL,
  slug                          text NOT NULL UNIQUE,
  destination_url               text NOT NULL,
  description                   text,
  status                        text NOT NULL DEFAULT 'active',
  expires_at                    timestamptz,
  max_clicks                    integer,
  click_count                   integer NOT NULL DEFAULT 0,
  interstitial_enabled          boolean NOT NULL DEFAULT false,
  interstitial_code             text,
  interstitial_fallback_seconds integer NOT NULL DEFAULT 8,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT links_status_valid
    CHECK (status IN ('active', 'paused', 'archived')),
  CONSTRAINT links_name_length
    CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT links_slug_format
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 64),
  CONSTRAINT links_destination_no_js
    CHECK (destination_url NOT ILIKE 'javascript:%'),
  CONSTRAINT links_description_length
    CHECK (description IS NULL OR char_length(description) <= 200),
  CONSTRAINT links_max_clicks_positive
    CHECK (max_clicks IS NULL OR max_clicks > 0),
  CONSTRAINT links_fallback_bounds
    CHECK (interstitial_fallback_seconds BETWEEN 1 AND 30)
);

CREATE INDEX IF NOT EXISTS links_status_expires_idx ON links (status, expires_at);
CREATE INDEX IF NOT EXISTS links_created_at_idx     ON links (created_at DESC);

ALTER TABLE links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all links"
  ON links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can create links"
  ON links FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can update links"
  ON links FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete links"
  ON links FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 2. DESTINATION HISTORY (append-only, trigger-populated)
-- ============================================================

CREATE TABLE IF NOT EXISTS link_destination_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id             uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  old_destination_url text NOT NULL,
  changed_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS link_destination_history_link_idx
  ON link_destination_history (link_id, changed_at DESC);

ALTER TABLE link_destination_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read destination history"
  ON link_destination_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE OR REPLACE FUNCTION log_destination_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF new.destination_url IS DISTINCT FROM old.destination_url THEN
    INSERT INTO link_destination_history (link_id, old_destination_url)
    VALUES (new.id, old.destination_url);
  END IF;

  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_destination_change ON links;
CREATE TRIGGER trg_log_destination_change
  BEFORE UPDATE ON links
  FOR EACH ROW EXECUTE FUNCTION log_destination_change();

-- ============================================================
-- 3. CLICK EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS link_clicks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id         uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at      timestamptz NOT NULL DEFAULT now(),
  referrer_domain text,
  device_type     text,
  visitor_hash    text,

  CONSTRAINT link_clicks_device_valid
    CHECK (device_type IS NULL OR device_type IN ('mobile', 'desktop', 'tablet'))
);

CREATE INDEX IF NOT EXISTS link_clicks_link_time_idx    ON link_clicks (link_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS link_clicks_link_visitor_idx ON link_clicks (link_id, visitor_hash);

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read clicks"
  ON link_clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 4. register_click — the ONLY anonymous entry point
-- ============================================================

CREATE OR REPLACE FUNCTION register_click(
  p_slug         text,
  p_referrer     text DEFAULT NULL,
  p_device       text DEFAULT NULL,
  p_visitor_hash text DEFAULT NULL
)
RETURNS TABLE (
  destination_url               text,
  interstitial_enabled          boolean,
  interstitial_code             text,
  interstitial_fallback_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link links%ROWTYPE;
BEGIN
  SELECT * INTO v_link FROM links WHERE links.slug = p_slug FOR UPDATE;

  -- Unknown slug, or archived: indistinguishable from not-found by design.
  IF NOT FOUND OR v_link.status = 'archived' THEN
    RETURN;
  END IF;

  IF v_link.status <> 'active' THEN
    RETURN;
  END IF;

  -- Expired, or this click would exceed the limit: auto-pause and stop.
  IF (v_link.expires_at IS NOT NULL AND v_link.expires_at < now())
     OR (v_link.max_clicks IS NOT NULL AND v_link.click_count >= v_link.max_clicks) THEN
    UPDATE links SET status = 'paused' WHERE id = v_link.id;
    RETURN;
  END IF;

  INSERT INTO link_clicks (link_id, referrer_domain, device_type, visitor_hash)
  VALUES (v_link.id, p_referrer, p_device, p_visitor_hash);

  UPDATE links SET click_count = links.click_count + 1 WHERE id = v_link.id;

  RETURN QUERY SELECT
    v_link.destination_url,
    v_link.interstitial_enabled,
    v_link.interstitial_code,
    v_link.interstitial_fallback_seconds;
END;
$$;

REVOKE ALL ON FUNCTION register_click(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION register_click(text, text, text, text) TO anon, authenticated;

-- ============================================================
-- 5. get_link_stats — admin aggregates (SECURITY INVOKER)
-- ============================================================

CREATE OR REPLACE FUNCTION get_link_stats(p_link_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH clicks AS (
    SELECT * FROM link_clicks WHERE link_id = p_link_id
  ),
  recent AS (
    SELECT * FROM clicks WHERE clicked_at >= (current_date - interval '29 days')
  ),
  days AS (
    SELECT generate_series(current_date - interval '29 days', current_date, interval '1 day')::date AS day
  )
  SELECT json_build_object(
    'total_clicks',    (SELECT count(*) FROM clicks),
    'unique_clicks',   (SELECT count(DISTINCT coalesce(visitor_hash, id::text)) FROM clicks),
    'last_clicked_at', (SELECT max(clicked_at) FROM clicks),
    'daily', (
      SELECT coalesce(json_agg(json_build_object('day', d.day, 'clicks', c.n) ORDER BY d.day), '[]'::json)
      FROM days d
      LEFT JOIN LATERAL (
        SELECT count(*) AS n FROM recent r WHERE r.clicked_at::date = d.day
      ) c ON true
    ),
    'devices', json_build_object(
      'mobile',  (SELECT count(*) FROM clicks WHERE device_type = 'mobile'),
      'desktop', (SELECT count(*) FROM clicks WHERE device_type = 'desktop'),
      'tablet',  (SELECT count(*) FROM clicks WHERE device_type = 'tablet')
    ),
    'referrers', (
      SELECT coalesce(json_agg(r ORDER BY r.clicks DESC), '[]'::json)
      FROM (
        SELECT
          coalesce(nullif(trim(referrer_domain), ''), 'Direct / QR scan') AS referrer,
          count(*) AS clicks
        FROM clicks
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
      ) r
    )
  );
$$;

REVOKE ALL ON FUNCTION get_link_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION get_link_stats(uuid) TO authenticated;
