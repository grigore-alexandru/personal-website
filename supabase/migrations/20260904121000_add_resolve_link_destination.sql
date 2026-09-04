/*
  # resolve_link_destination — a read-only lookup for link previews

  ## Problem
  `register_click()` is the only function granted to `anon`, and it always
  writes: it inserts a row into `link_clicks`, increments `click_count`, and
  will flip a link to 'paused' when the click limit is reached.

  That is correct for a visitor and wrong for a crawler. Every social platform
  prefetches a URL to build its preview card, so pasting a short link into one
  WhatsApp group fired several requests that were all recorded as real clicks —
  and a link with `max_clicks` could be exhausted and auto-paused before a
  human ever opened it.

  ## Change
  A STABLE, side-effect-free resolver so /r/[slug] can answer a crawler without
  touching the click log. It enforces exactly the same visibility rules as
  register_click (active, not expired, under the limit) so a preview can never
  reveal the destination of a link a visitor would not be redirected to.

  It deliberately returns ONLY the destination URL — not the name, description,
  status or counters — keeping the anon surface as narrow as register_click's.

  SECURITY DEFINER is required because `links` has no anon SELECT policy at all;
  the same pattern register_click already uses.
*/

CREATE OR REPLACE FUNCTION resolve_link_destination(p_slug text)
RETURNS TABLE (destination_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT l.destination_url
  FROM links l
  WHERE l.slug = p_slug
    AND l.status = 'active'
    AND (l.expires_at IS NULL OR l.expires_at > now())
    AND (l.max_clicks IS NULL OR l.click_count < l.max_clicks);
$$;

REVOKE ALL ON FUNCTION resolve_link_destination(text) FROM public;
GRANT EXECUTE ON FUNCTION resolve_link_destination(text) TO anon, authenticated;
