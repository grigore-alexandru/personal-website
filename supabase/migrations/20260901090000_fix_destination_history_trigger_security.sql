/*
  # Fix: destination-history trigger blocked by its own table's RLS

  ## Bug
  log_destination_change() ran as SECURITY INVOKER (the Postgres default), so
  it executed as whichever admin user triggered the UPDATE. But
  link_destination_history has no INSERT policy for any role — it's meant to
  be append-only via this trigger, never written to directly. With RLS
  enabled and no INSERT policy, every insert was denied by default, including
  the trigger's own — so any edit to links.destination_url failed with:
  "new row violates row-level security policy for table
  link_destination_history".

  ## Fix
  SECURITY DEFINER, the same pattern already used by register_click(). The
  trigger gets its own privilege to log a change; the table still has no
  direct write path open to any role — it can only ever be populated by this
  trigger.
*/

CREATE OR REPLACE FUNCTION log_destination_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
