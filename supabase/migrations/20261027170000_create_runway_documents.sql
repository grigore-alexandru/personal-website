-- Application Runway (applied with the Supabase MCP on 2026-10-27; recorded here for history).
-- One JSON document (schools, away periods, tasks) in row 'main'; admins read/write it through
-- /api/admin/runway; the Mac's dev server syncs it with token-checked functions; Claude reads it
-- through the runway_task_list view and edits single tasks with runway_update_task.

create table public.runway_documents (
  id text primary key default 'main',
  doc jsonb not null,
  hash text generated always as (md5(doc::text)) stored,
  updated_at timestamptz not null default now()
);
alter table public.runway_documents enable row level security;
create policy "Admins manage runway" on public.runway_documents
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create or replace function public.runway_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger runway_touch before update on public.runway_documents for each row execute function public.runway_touch();

create table public.runway_sync_tokens (
  token_sha256 text primary key,
  label text not null default '',
  created_at timestamptz not null default now()
);
alter table public.runway_sync_tokens enable row level security;

create or replace function public.runway_pull(p_token text)
returns table (doc jsonb, hash text)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.runway_sync_tokens t where t.token_sha256 = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  return query select d.doc, d.hash from public.runway_documents d where d.id = 'main';
end $$;

create or replace function public.runway_push(p_token text, p_doc jsonb, p_if_hash text)
returns text
language plpgsql security definer set search_path = '' as $$
declare new_hash text;
begin
  if not exists (select 1 from public.runway_sync_tokens t where t.token_sha256 = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  if p_if_hash is null then
    insert into public.runway_documents (id, doc) values ('main', p_doc)
      on conflict (id) do update set doc = excluded.doc
      returning hash into new_hash;
  else
    update public.runway_documents set doc = p_doc where id = 'main' and hash = p_if_hash returning hash into new_hash;
  end if;
  return new_hash;
end $$;

create or replace function public.runway_hash(p_token text)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.runway_sync_tokens t where t.token_sha256 = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  return (select d.hash from public.runway_documents d where d.id = 'main');
end $$;

revoke all on function public.runway_pull(text) from public;
revoke all on function public.runway_push(text, jsonb, text) from public;
revoke all on function public.runway_hash(text) from public;
grant execute on function public.runway_pull(text) to anon, authenticated;
grant execute on function public.runway_push(text, jsonb, text) to anon, authenticated;
grant execute on function public.runway_hash(text) to anon, authenticated;

create view public.runway_task_list with (security_invoker = true) as
select
  t->>'id' as id, s->>'name' as school, t->>'schoolId' as school_id, p->>'title' as parent_title,
  t->>'title' as title, t->>'status' as status, t->>'category' as category, t->>'milestone' as milestone,
  (t->>'start')::date as start, (t->>'deadline')::date as deadline, (t->>'duration')::int as duration_min,
  (t->>'rating')::int as rating, (t->>'optional')::boolean as optional, t->>'note' as note,
  t->>'parentId' as parent_id,
  exists (select 1 from jsonb_array_elements(d.doc->'tasks') c where c->>'parentId' = t->>'id') as has_subtasks
from public.runway_documents d
cross join lateral jsonb_array_elements(d.doc->'tasks') t
left join lateral (select x from jsonb_array_elements(d.doc->'schools') x where x->>'id' = t->>'schoolId') sx(s) on true
left join lateral (select y from jsonb_array_elements(d.doc->'tasks') y where y->>'id' = t->>'parentId') px(p) on true
where d.id = 'main';
revoke all on public.runway_task_list from anon;

create or replace function public.runway_update_task(p_task_id text, p_patch jsonb)
returns jsonb
language plpgsql set search_path = '' as $$
declare
  allowed text[] := array['status','note','title','start','deadline','duration','rating','optional','category'];
  k text;
  updated jsonb;
begin
  for k in select jsonb_object_keys(p_patch) loop
    if not (k = any(allowed)) then raise exception 'field % cannot be changed here', k; end if;
  end loop;
  update public.runway_documents d
     set doc = jsonb_set(d.doc, '{tasks}', (
       select jsonb_agg(case when t->>'id' = p_task_id then t || p_patch else t end order by ord)
       from jsonb_array_elements(d.doc->'tasks') with ordinality as e(t, ord)))
   where d.id = 'main' and d.doc->'tasks' @> jsonb_build_array(jsonb_build_object('id', p_task_id));
  if not found then raise exception 'no task %', p_task_id; end if;
  select t into updated from public.runway_documents d, jsonb_array_elements(d.doc->'tasks') t where d.id = 'main' and t->>'id' = p_task_id;
  return updated;
end $$;
revoke all on function public.runway_update_task(text, jsonb) from public, anon;
grant execute on function public.runway_update_task(text, jsonb) to authenticated;
