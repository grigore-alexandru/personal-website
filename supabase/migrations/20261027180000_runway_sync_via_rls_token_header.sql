-- Application Runway (applied with the Supabase MCP on 2026-10-27; recorded here for history).
-- The Mac's sync no longer uses public SECURITY DEFINER functions: it reads/writes
-- public.runway_documents directly with its token in the x-runway-token header; an RLS policy checks
-- it through a helper in a schema the API does not expose. Clears the "public can execute SECURITY
-- DEFINER function" advisories for runway_*.
create schema if not exists runway_private;
revoke all on schema runway_private from public;
grant usage on schema runway_private to anon, authenticated;

alter table public.runway_sync_tokens set schema runway_private;
revoke all on runway_private.runway_sync_tokens from public, anon, authenticated;
create policy "No client access" on runway_private.runway_sync_tokens for all to anon, authenticated using (false) with check (false);

create or replace function runway_private.token_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from runway_private.runway_sync_tokens t
    where t.token_sha256 = encode(extensions.digest(
      coalesce(current_setting('request.headers', true)::json->>'x-runway-token', ''), 'sha256'), 'hex')
  );
$$;
revoke all on function runway_private.token_ok() from public;
grant execute on function runway_private.token_ok() to anon, authenticated;

create policy "Mac sync token manages runway" on public.runway_documents
  for all to anon
  using (runway_private.token_ok())
  with check (runway_private.token_ok());
grant select, insert, update on public.runway_documents to anon;

drop function public.runway_pull(text);
drop function public.runway_push(text, jsonb, text);
drop function public.runway_hash(text);
