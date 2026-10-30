-- 0001_trip_planner.sql
-- Trip planner: one JSON document per trip, admin-only, mirrors the Application Runway pattern.
-- Apply with the Supabase connector (apply_migration) or `supabase db push`. Idempotent where practical.

begin;

-- ---------------------------------------------------------------------------
-- 1. Private schema for helpers (not exposed by PostgREST)
-- ---------------------------------------------------------------------------
create schema if not exists trip_private;
revoke all on schema trip_private from public;
grant usage on schema trip_private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------
create table if not exists public.trip_documents (
  id         text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  doc        jsonb not null check (jsonb_typeof(doc) = 'object'),
  hash       text generated always as (md5(doc::text)) stored,
  updated_at timestamptz not null default now()
);

create or replace function public.trip_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trip_touch on public.trip_documents;
create trigger trip_touch before update on public.trip_documents
for each row execute function public.trip_touch();

alter table public.trip_documents enable row level security;

drop policy if exists "Admins manage trips" on public.trip_documents;
create policy "Admins manage trips" on public.trip_documents
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

revoke all on table public.trip_documents from public, anon;
revoke delete, truncate on table public.trip_documents from authenticated;
grant select, insert, update on table public.trip_documents to authenticated;
grant all on table public.trip_documents to service_role;

-- ---------------------------------------------------------------------------
-- 3. Private helpers
-- ---------------------------------------------------------------------------

-- Index (0-based) of the first array element whose `key` equals `val`, or null.
create or replace function trip_private.idx(arr jsonb, key text, val text)
returns integer language sql immutable set search_path = '' as $$
  select (e.ord - 1)::integer
  from jsonb_array_elements(coalesce(arr, '[]'::jsonb)) with ordinality as e(v, ord)
  where e.v ->> key = val
  limit 1
$$;

-- Insert `elem` into array `arr` at 0-based position `pos` (null = append; clamped to [0, len]).
create or replace function trip_private.insert_at(arr jsonb, elem jsonb, pos integer)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  a jsonb := coalesce(arr, '[]'::jsonb);
  n integer := jsonb_array_length(coalesce(arr, '[]'::jsonb));
  p integer;
begin
  p := greatest(0, least(coalesce(pos, n), n));
  return coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(a) with ordinality e(v, ord) where e.ord <= p), '[]'::jsonb)
      || jsonb_build_array(elem)
      || coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(a) with ordinality e(v, ord) where e.ord > p), '[]'::jsonb);
end $$;

-- Reject any key that is not whitelisted.
create or replace function trip_private.check_keys(p_patch jsonb, p_allowed text[])
returns void language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'patch must be a JSON object';
  end if;
  for k in select jsonb_object_keys(p_patch) loop
    if not (k = any(p_allowed)) then
      raise exception 'field % cannot be changed here', k;
    end if;
  end loop;
end $$;

-- Locate an item anywhere in the trip: returns (day_idx, item_idx), both null when missing.
create or replace function trip_private.find_item(d jsonb, p_item_id text, out day_idx integer, out item_idx integer)
language sql immutable set search_path = '' as $$
  select (dd.ord - 1)::integer, (it.ord - 1)::integer
  from jsonb_array_elements(d -> 'days') with ordinality dd(v, ord),
       jsonb_array_elements(coalesce(dd.v -> 'items', '[]'::jsonb)) with ordinality it(v, ord)
  where it.v ->> 'id' = p_item_id
  limit 1
$$;

-- Validate a non-negative integer (or JSON null / missing).
create or replace function trip_private.check_int(v jsonb, label text, min_value integer)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if v is null or jsonb_typeof(v) = 'null' then return; end if;
  if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric) or (v #>> '{}')::numeric < min_value then
    raise exception '% must be an integer >= %', label, min_value;
  end if;
end $$;

-- Fill defaults and validate one cost line.
create or replace function trip_private.normalize_cost(c jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare res jsonb;
begin
  perform trip_private.check_keys(c, array['id','label','category','amountCents','amountMaxCents','qty','paid','source','verifiedAt','note']);
  res := jsonb_build_object('amountCents', null, 'amountMaxCents', null, 'qty', 1, 'paid', false,
                            'source', 'manual', 'verifiedAt', null, 'note', null) || c;
  if coalesce(res ->> 'id', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'cost id must be a slug'; end if;
  if coalesce(res ->> 'label', '') = '' then raise exception 'cost label is required'; end if;
  if not coalesce(res ->> 'category' = any(array['bilet','transport','mancare','cazare','zbor','altele']), false) then
    raise exception 'bad cost category %', res ->> 'category';
  end if;
  if not coalesce(res ->> 'source' = any(array['note','claude','manual']), false) then
    raise exception 'bad cost source %', res ->> 'source';
  end if;
  if jsonb_typeof(res -> 'paid') <> 'boolean' then raise exception 'paid must be true/false'; end if;
  perform trip_private.check_int(res -> 'amountCents', 'amountCents', 0);
  perform trip_private.check_int(res -> 'amountMaxCents', 'amountMaxCents', 0);
  perform trip_private.check_int(res -> 'qty', 'qty', 1);
  if jsonb_typeof(res -> 'qty') <> 'number' then raise exception 'qty is required'; end if;
  if res ->> 'amountMaxCents' is not null then
    if res ->> 'amountCents' is null then raise exception 'amountMaxCents needs amountCents'; end if;
    if (res ->> 'amountMaxCents')::int < (res ->> 'amountCents')::int then raise exception 'amountMaxCents < amountCents'; end if;
  end if;
  if res ->> 'verifiedAt' is not null and res ->> 'verifiedAt' !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'verifiedAt must be YYYY-MM-DD';
  end if;
  return res;
end $$;

-- Validate one schedule item (after defaults were applied).
create or replace function trip_private.check_item(it jsonb)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if coalesce(it ->> 'id', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'item id must be a slug'; end if;
  if not coalesce(it ->> 'kind' = any(array['visit','transport','deadline','note']), false) then
    raise exception 'bad item kind %', it ->> 'kind';
  end if;
  if it ->> 'start' is not null and it ->> 'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'start must be HH:mm';
  end if;
  perform trip_private.check_int(it -> 'durationMin', 'durationMin', 0);
  if jsonb_typeof(it -> 'fixed') <> 'boolean' or jsonb_typeof(it -> 'done') <> 'boolean' then
    raise exception 'fixed/done must be true/false';
  end if;
  if jsonb_typeof(it -> 'costs') <> 'array' then raise exception 'costs must be an array'; end if;
  if it ->> 'placeId' is null and coalesce(it ->> 'label', '') = '' then
    raise exception 'item needs placeId or label';
  end if;
end $$;

-- Lock and load a trip document (RLS applies: non-admins get "no trip").
create or replace function trip_private.load(p_trip text)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb;
begin
  select t.doc into d from public.trip_documents t where t.id = p_trip for update;
  if d is null then raise exception 'no trip %', p_trip; end if;
  return d;
end $$;

create or replace function trip_private.store(p_trip text, d jsonb)
returns void language plpgsql set search_path = '' as $$
begin
  if octet_length(d::text) > 1048576 then raise exception 'trip document too large'; end if;
  d := jsonb_set(d, '{meta,updatedBy}', to_jsonb('sql'::text));
  update public.trip_documents t set doc = d where t.id = p_trip;
end $$;

-- Path (text[]) of the cost array for a scope: fixed | day (owner = date) | item (owner = item id).
create or replace function trip_private.cost_path(d jsonb, p_scope text, p_owner text)
returns text[] language plpgsql immutable set search_path = '' as $$
declare di integer; r record;
begin
  if p_scope = 'fixed' then
    return array['fixedCosts'];
  elsif p_scope = 'day' then
    di := trip_private.idx(d -> 'days', 'date', p_owner);
    if di is null then raise exception 'no day %', p_owner; end if;
    return array['days', di::text, 'costs'];
  elsif p_scope = 'item' then
    select * into r from trip_private.find_item(d, p_owner);
    if r.day_idx is null then raise exception 'no item %', p_owner; end if;
    return array['days', r.day_idx::text, 'items', r.item_idx::text, 'costs'];
  end if;
  raise exception 'scope must be fixed, day or item';
end $$;

-- ---------------------------------------------------------------------------
-- 4. App write path: compare-and-swap save of the whole document
-- ---------------------------------------------------------------------------
create or replace function public.trip_save(p_trip text, p_expected_hash text, p_doc jsonb)
returns table (new_hash text, saved_at timestamptz)
language plpgsql set search_path = '' as $$
declare v_hash text; v_at timestamptz;
begin
  if p_doc is null or jsonb_typeof(p_doc) <> 'object'
     or p_doc ->> 'version' is distinct from '1'
     or jsonb_typeof(p_doc -> 'days') is distinct from 'array'
     or jsonb_typeof(p_doc -> 'places') is distinct from 'array'
     or p_doc #>> '{trip,id}' is distinct from p_trip then
    raise exception 'trip_invalid';
  end if;
  if octet_length(p_doc::text) > 1048576 then raise exception 'trip_too_large'; end if;

  update public.trip_documents t set doc = p_doc
   where t.id = p_trip and t.hash = p_expected_hash
   returning t.hash, t.updated_at into v_hash, v_at;

  if not found then
    if exists (select 1 from public.trip_documents t where t.id = p_trip) then
      raise exception 'trip_conflict';
    end if;
    raise exception 'trip_not_found';
  end if;

  new_hash := v_hash;
  saved_at := v_at;
  return next;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Claude write path: small, validated, targeted changes (never the whole doc)
-- ---------------------------------------------------------------------------

create or replace function public.trip_update_trip(p_trip text, p_patch jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb;
begin
  perform trip_private.check_keys(p_patch, array['title','arrival','departure','fxRonPerUsd','notes']);
  d := trip_private.load(p_trip);
  d := jsonb_set(d, '{trip}', (d -> 'trip') || p_patch);
  perform trip_private.store(p_trip, d);
  return d -> 'trip';
end $$;

create or replace function public.trip_set_base(p_trip text, p_base jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb;
begin
  if p_base is not null and jsonb_typeof(p_base) <> 'null' then
    perform trip_private.check_keys(p_base, array['name','address','lat','lng','googlePlaceId']);
    if jsonb_typeof(p_base -> 'lat') <> 'number' or jsonb_typeof(p_base -> 'lng') <> 'number' then
      raise exception 'base needs numeric lat and lng';
    end if;
    p_base := jsonb_build_object('name', null, 'address', null, 'googlePlaceId', null) || p_base;
  else
    p_base := 'null'::jsonb;
  end if;
  d := trip_private.load(p_trip);
  d := jsonb_set(d, '{trip,base}', p_base);
  -- travel times from/to the old base are no longer valid
  d := jsonb_set(d, '{legs}', coalesce((
         select jsonb_object_agg(l.key, l.value)
         from jsonb_each(coalesce(d -> 'legs', '{}'::jsonb)) l
         where split_part(l.key, '>', 1) <> 'base' and split_part(l.key, '>', 2) <> 'base'), '{}'::jsonb));
  perform trip_private.store(p_trip, d);
  return d #> '{trip,base}';
end $$;

create or replace function public.trip_update_place(p_trip text, p_place_id text, p_patch jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; i integer;
begin
  perform trip_private.check_keys(p_patch, array['name','kind','area','parentId','priority','location','meetingPoint',
    'photos','duration','hours','transport','booking','costTemplate','links','notes']);
  d := trip_private.load(p_trip);
  i := trip_private.idx(d -> 'places', 'id', p_place_id);
  if i is null then raise exception 'no place %', p_place_id; end if;
  if p_patch ? 'costTemplate' then
    p_patch := jsonb_set(p_patch, '{costTemplate}', coalesce((
      select jsonb_agg(trip_private.normalize_cost(c)) from jsonb_array_elements(p_patch -> 'costTemplate') c), '[]'::jsonb));
  end if;
  d := jsonb_set(d, array['places', i::text], (d -> 'places' -> i) || p_patch);
  perform trip_private.store(p_trip, d);
  return d -> 'places' -> i;
end $$;

create or replace function public.trip_set_booking(p_trip text, p_place_id text, p_patch jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; i integer; b jsonb;
begin
  perform trip_private.check_keys(p_patch, array['required','status','url','bookBy','reference','note']);
  if p_patch ? 'status' and not coalesce(p_patch ->> 'status' = any(array['todo','booked','not-needed']), false) then
    raise exception 'booking status must be todo, booked or not-needed';
  end if;
  d := trip_private.load(p_trip);
  i := trip_private.idx(d -> 'places', 'id', p_place_id);
  if i is null then raise exception 'no place %', p_place_id; end if;
  b := jsonb_build_object('required', false, 'status', 'todo', 'url', null, 'bookBy', null, 'reference', null, 'note', null)
       || coalesce(nullif(d -> 'places' -> i -> 'booking', 'null'::jsonb), '{}'::jsonb) || p_patch;
  d := jsonb_set(d, array['places', i::text, 'booking'], b);
  perform trip_private.store(p_trip, d);
  return b;
end $$;

create or replace function public.trip_update_day(p_trip text, p_date text, p_patch jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; i integer;
begin
  perform trip_private.check_keys(p_patch, array['status','kind','title','coverPlaceId','notes']);
  if p_patch ? 'status' and not coalesce(p_patch ->> 'status' = any(array['draft','confirmed']), false) then
    raise exception 'day status must be draft or confirmed';
  end if;
  if p_patch ? 'kind' and not coalesce(p_patch ->> 'kind' = any(array['city','daytrip','valley','travel']), false) then
    raise exception 'day kind must be city, daytrip, valley or travel';
  end if;
  d := trip_private.load(p_trip);
  i := trip_private.idx(d -> 'days', 'date', p_date);
  if i is null then raise exception 'no day %', p_date; end if;
  if p_patch ->> 'coverPlaceId' is not null and trip_private.idx(d -> 'places', 'id', p_patch ->> 'coverPlaceId') is null then
    raise exception 'no place %', p_patch ->> 'coverPlaceId';
  end if;
  d := jsonb_set(d, array['days', i::text], (d -> 'days' -> i) || p_patch);
  perform trip_private.store(p_trip, d);
  return (d -> 'days' -> i) - 'items';
end $$;

create or replace function public.trip_add_item(p_trip text, p_date text, p_item jsonb, p_position integer default null)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; di integer; pi integer; it jsonb; existing record;
begin
  perform trip_private.check_keys(p_item, array['id','placeId','label','kind','start','durationMin','fixed','done','costs','notes','calendarEventId']);
  d := trip_private.load(p_trip);
  di := trip_private.idx(d -> 'days', 'date', p_date);
  if di is null then raise exception 'no day %', p_date; end if;
  select * into existing from trip_private.find_item(d, p_item ->> 'id');
  if existing.day_idx is not null then raise exception 'item % already exists', p_item ->> 'id'; end if;
  if p_item ->> 'placeId' is not null then
    pi := trip_private.idx(d -> 'places', 'id', p_item ->> 'placeId');
    if pi is null then raise exception 'no place %', p_item ->> 'placeId'; end if;
  end if;
  it := jsonb_build_object(
          'placeId', null, 'label', null, 'kind', 'visit', 'start', null, 'durationMin', null,
          'fixed', false, 'done', false, 'notes', null, 'calendarEventId', null,
          'costs', case when pi is not null then coalesce(d -> 'places' -> pi -> 'costTemplate', '[]'::jsonb) else '[]'::jsonb end
        ) || p_item;
  if jsonb_typeof(it -> 'costs') <> 'array' then raise exception 'costs must be an array'; end if;
  it := jsonb_set(it, '{costs}', coalesce((
          select jsonb_agg(trip_private.normalize_cost(c)) from jsonb_array_elements(it -> 'costs') c), '[]'::jsonb));
  perform trip_private.check_item(it);
  d := jsonb_set(d, array['days', di::text, 'items'], trip_private.insert_at(d -> 'days' -> di -> 'items', it, p_position));
  perform trip_private.store(p_trip, d);
  return it;
end $$;

create or replace function public.trip_update_item(p_trip text, p_item_id text, p_patch jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; r record; it jsonb;
begin
  perform trip_private.check_keys(p_patch, array['label','kind','start','durationMin','fixed','done','notes','calendarEventId']);
  d := trip_private.load(p_trip);
  select * into r from trip_private.find_item(d, p_item_id);
  if r.day_idx is null then raise exception 'no item %', p_item_id; end if;
  it := (d -> 'days' -> r.day_idx -> 'items' -> r.item_idx) || p_patch;
  perform trip_private.check_item(it);
  d := jsonb_set(d, array['days', r.day_idx::text, 'items', r.item_idx::text], it);
  perform trip_private.store(p_trip, d);
  return it;
end $$;

create or replace function public.trip_move_item(p_trip text, p_item_id text, p_to_date text, p_position integer default null)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; r record; it jsonb; ti integer; from_date text;
begin
  d := trip_private.load(p_trip);
  select * into r from trip_private.find_item(d, p_item_id);
  if r.day_idx is null then raise exception 'no item %', p_item_id; end if;
  ti := trip_private.idx(d -> 'days', 'date', p_to_date);
  if ti is null then raise exception 'no day %', p_to_date; end if;
  it := d -> 'days' -> r.day_idx -> 'items' -> r.item_idx;
  from_date := d -> 'days' -> r.day_idx ->> 'date';
  d := jsonb_set(d, array['days', r.day_idx::text, 'items'], (d -> 'days' -> r.day_idx -> 'items') - r.item_idx);
  d := jsonb_set(d, array['days', ti::text, 'items'], trip_private.insert_at(d -> 'days' -> ti -> 'items', it, p_position));
  perform trip_private.store(p_trip, d);
  return jsonb_build_object('item', it, 'from', from_date, 'to', p_to_date);
end $$;

create or replace function public.trip_remove_item(p_trip text, p_item_id text)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; r record; it jsonb;
begin
  d := trip_private.load(p_trip);
  select * into r from trip_private.find_item(d, p_item_id);
  if r.day_idx is null then raise exception 'no item %', p_item_id; end if;
  it := d -> 'days' -> r.day_idx -> 'items' -> r.item_idx;
  d := jsonb_set(d, array['days', r.day_idx::text, 'items'], (d -> 'days' -> r.day_idx -> 'items') - r.item_idx);
  perform trip_private.store(p_trip, d);
  return it;
end $$;

create or replace function public.trip_add_cost(p_trip text, p_scope text, p_owner text, p_cost jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; path text[]; arr jsonb; c jsonb;
begin
  d := trip_private.load(p_trip);
  path := trip_private.cost_path(d, p_scope, p_owner);
  arr := coalesce(d #> path, '[]'::jsonb);
  c := trip_private.normalize_cost(p_cost);
  if trip_private.idx(arr, 'id', c ->> 'id') is not null then
    raise exception 'cost % already exists there', c ->> 'id';
  end if;
  d := jsonb_set(d, path, arr || jsonb_build_array(c));
  perform trip_private.store(p_trip, d);
  return c;
end $$;

create or replace function public.trip_update_cost(p_trip text, p_scope text, p_owner text, p_cost_id text, p_patch jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; path text[]; arr jsonb; i integer; c jsonb;
begin
  perform trip_private.check_keys(p_patch, array['label','category','amountCents','amountMaxCents','qty','paid','source','verifiedAt','note']);
  d := trip_private.load(p_trip);
  path := trip_private.cost_path(d, p_scope, p_owner);
  arr := coalesce(d #> path, '[]'::jsonb);
  i := trip_private.idx(arr, 'id', p_cost_id);
  if i is null then raise exception 'no cost % in % %', p_cost_id, p_scope, coalesce(p_owner, ''); end if;
  c := trip_private.normalize_cost((arr -> i) || p_patch);
  d := jsonb_set(d, path || i::text, c);
  perform trip_private.store(p_trip, d);
  return c;
end $$;

-- Merge computed travel times. Keys: "<from>><to>><mode>", from/to = place id or "base".
create or replace function public.trip_merge_legs(p_trip text, p_legs jsonb)
returns integer language plpgsql set search_path = '' as $$
declare d jsonb; l record; merged jsonb := '{}'::jsonb; n integer := 0;
begin
  if p_legs is null or jsonb_typeof(p_legs) <> 'object' then raise exception 'legs must be an object'; end if;
  for l in select key, value from jsonb_each(p_legs) loop
    if l.key !~ '^[a-z0-9-]+>[a-z0-9-]+>(transit|walking|driving|bicycling)$' then
      raise exception 'bad leg key %', l.key;
    end if;
    perform trip_private.check_keys(l.value, array['minutes','meters','departAt','computedAt','summary']);
    perform trip_private.check_int(l.value -> 'minutes', 'minutes', 0);
    if jsonb_typeof(l.value -> 'minutes') <> 'number' or jsonb_typeof(l.value -> 'computedAt') <> 'string' then
      raise exception 'leg % needs minutes and computedAt', l.key;
    end if;
    merged := merged || jsonb_build_object(l.key,
      jsonb_build_object('meters', null, 'departAt', null, 'summary', null) || l.value
      || jsonb_build_object('from', split_part(l.key, '>', 1), 'to', split_part(l.key, '>', 2), 'mode', split_part(l.key, '>', 3)));
    n := n + 1;
  end loop;
  d := trip_private.load(p_trip);
  d := jsonb_set(d, '{legs}', coalesce(d -> 'legs', '{}'::jsonb) || merged);
  perform trip_private.store(p_trip, d);
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Read views (security_invoker so RLS applies, like runway_task_list)
-- ---------------------------------------------------------------------------
create or replace view public.trip_places_v with (security_invoker = true) as
select t.id as trip_id,
       p.v ->> 'id' as place_id,
       p.v ->> 'name' as name,
       p.v ->> 'kind' as kind,
       p.v ->> 'area' as area,
       p.v ->> 'parentId' as parent_id,
       p.v #>> '{hours,text}' as hours,
       case when jsonb_typeof(p.v #> '{hours,closedWeekdays}') = 'array'
            then (select array_agg(w::int order by w::int) from jsonb_array_elements_text(p.v #> '{hours,closedWeekdays}') w)
       end as closed_weekdays,
       coalesce((p.v #>> '{booking,required}')::boolean, false) as booking_required,
       p.v #>> '{booking,status}' as booking_status,
       p.v #>> '{booking,url}' as booking_url,
       (select array_agg(dd.v ->> 'date' order by dd.v ->> 'date')
          from jsonb_array_elements(t.doc -> 'days') dd(v),
               jsonb_array_elements(coalesce(dd.v -> 'items', '[]'::jsonb)) it(v)
         where it.v ->> 'placeId' = p.v ->> 'id') as scheduled_dates,
       jsonb_array_length(coalesce(p.v -> 'photos', '[]'::jsonb)) as photo_count,
       coalesce(jsonb_typeof(p.v -> 'location') = 'object', false) as has_location,
       (p.v ->> 'id') = any(array(select pp.v ->> 'parentId' from jsonb_array_elements(t.doc -> 'places') pp(v))) as has_children,
       (p.ord - 1)::int as position
from public.trip_documents t
cross join lateral jsonb_array_elements(t.doc -> 'places') with ordinality p(v, ord);

create or replace view public.trip_items_v with (security_invoker = true) as
select t.id as trip_id,
       (dd.v ->> 'date')::date as date,
       extract(dow from (dd.v ->> 'date')::date)::int as dow,
       dd.v ->> 'status' as day_status,
       dd.v ->> 'kind' as day_kind,
       dd.v ->> 'title' as day_title,
       (it.ord - 1)::int as position,
       it.v ->> 'id' as item_id,
       it.v ->> 'placeId' as place_id,
       coalesce(it.v ->> 'label', pl.v ->> 'name') as name,
       it.v ->> 'kind' as kind,
       it.v ->> 'start' as start,
       (it.v ->> 'durationMin')::int as duration_min,
       coalesce((it.v ->> 'fixed')::boolean, false) as fixed,
       coalesce((it.v ->> 'done')::boolean, false) as done,
       c.min_cents, c.max_cents, c.missing_prices
from public.trip_documents t
cross join lateral jsonb_array_elements(t.doc -> 'days') dd(v)
cross join lateral jsonb_array_elements(coalesce(dd.v -> 'items', '[]'::jsonb)) with ordinality it(v, ord)
left join lateral (
  select x.v from jsonb_array_elements(t.doc -> 'places') x(v) where x.v ->> 'id' = it.v ->> 'placeId' limit 1
) pl on true
cross join lateral (
  select coalesce(sum(coalesce((cl.v ->> 'amountCents')::int, 0) * coalesce((cl.v ->> 'qty')::int, 1)), 0)::int as min_cents,
         coalesce(sum(coalesce((cl.v ->> 'amountMaxCents')::int, (cl.v ->> 'amountCents')::int, 0) * coalesce((cl.v ->> 'qty')::int, 1)), 0)::int as max_cents,
         (count(*) filter (where cl.v ->> 'amountCents' is null))::int as missing_prices
  from jsonb_array_elements(coalesce(it.v -> 'costs', '[]'::jsonb)) cl(v)
) c;

create or replace view public.trip_cost_lines_v with (security_invoker = true) as
select t.id as trip_id, 'fixed'::text as scope, null::date as date, null::text as item_id, null::text as item_name,
       c.v ->> 'id' as cost_id, c.v ->> 'label' as label, c.v ->> 'category' as category,
       (c.v ->> 'amountCents')::int as amount_cents, (c.v ->> 'amountMaxCents')::int as amount_max_cents,
       coalesce((c.v ->> 'qty')::int, 1) as qty, coalesce((c.v ->> 'paid')::boolean, false) as paid,
       c.v ->> 'source' as source, c.v ->> 'note' as note
from public.trip_documents t
cross join lateral jsonb_array_elements(coalesce(t.doc -> 'fixedCosts', '[]'::jsonb)) c(v)
union all
select t.id, 'day', (dd.v ->> 'date')::date, null, null,
       c.v ->> 'id', c.v ->> 'label', c.v ->> 'category',
       (c.v ->> 'amountCents')::int, (c.v ->> 'amountMaxCents')::int,
       coalesce((c.v ->> 'qty')::int, 1), coalesce((c.v ->> 'paid')::boolean, false),
       c.v ->> 'source', c.v ->> 'note'
from public.trip_documents t
cross join lateral jsonb_array_elements(t.doc -> 'days') dd(v)
cross join lateral jsonb_array_elements(coalesce(dd.v -> 'costs', '[]'::jsonb)) c(v)
union all
select t.id, 'item', (dd.v ->> 'date')::date, it.v ->> 'id',
       coalesce(it.v ->> 'label', (select x.v ->> 'name' from jsonb_array_elements(t.doc -> 'places') x(v) where x.v ->> 'id' = it.v ->> 'placeId' limit 1)),
       c.v ->> 'id', c.v ->> 'label', c.v ->> 'category',
       (c.v ->> 'amountCents')::int, (c.v ->> 'amountMaxCents')::int,
       coalesce((c.v ->> 'qty')::int, 1), coalesce((c.v ->> 'paid')::boolean, false),
       c.v ->> 'source', c.v ->> 'note'
from public.trip_documents t
cross join lateral jsonb_array_elements(t.doc -> 'days') dd(v)
cross join lateral jsonb_array_elements(coalesce(dd.v -> 'items', '[]'::jsonb)) it(v)
cross join lateral jsonb_array_elements(coalesce(it.v -> 'costs', '[]'::jsonb)) c(v);

create or replace view public.trip_day_budget_v with (security_invoker = true) as
select t.id as trip_id,
       (dd.v ->> 'date')::date as date,
       dd.v ->> 'title' as title,
       dd.v ->> 'status' as status,
       dd.v ->> 'kind' as kind,
       coalesce(b.min_cents, 0) as min_cents,
       coalesce(b.max_cents, 0) as max_cents,
       coalesce(b.missing_prices, 0) as missing_prices,
       coalesce(b.paid_cents, 0) as paid_cents
from public.trip_documents t
cross join lateral jsonb_array_elements(t.doc -> 'days') dd(v)
left join lateral (
  select sum(coalesce(l.amount_cents, 0) * l.qty)::int as min_cents,
         sum(coalesce(l.amount_max_cents, l.amount_cents, 0) * l.qty)::int as max_cents,
         (count(*) filter (where l.amount_cents is null))::int as missing_prices,
         sum(case when l.paid then coalesce(l.amount_cents, 0) * l.qty else 0 end)::int as paid_cents
  from public.trip_cost_lines_v l
  where l.trip_id = t.id and l.date = (dd.v ->> 'date')::date and l.scope in ('day', 'item')
) b on true;

-- ---------------------------------------------------------------------------
-- 7. Grants (same shape as runway: nothing for anon)
-- ---------------------------------------------------------------------------
revoke all on public.trip_places_v, public.trip_items_v, public.trip_cost_lines_v, public.trip_day_budget_v from public, anon;
grant select on public.trip_places_v, public.trip_items_v, public.trip_cost_lines_v, public.trip_day_budget_v to authenticated, service_role;

revoke execute on all functions in schema trip_private from public, anon;
grant execute on all functions in schema trip_private to authenticated, service_role;

revoke execute on function
  public.trip_save(text, text, jsonb),
  public.trip_update_trip(text, jsonb),
  public.trip_set_base(text, jsonb),
  public.trip_update_place(text, text, jsonb),
  public.trip_set_booking(text, text, jsonb),
  public.trip_update_day(text, text, jsonb),
  public.trip_add_item(text, text, jsonb, integer),
  public.trip_update_item(text, text, jsonb),
  public.trip_move_item(text, text, text, integer),
  public.trip_remove_item(text, text),
  public.trip_add_cost(text, text, text, jsonb),
  public.trip_update_cost(text, text, text, text, jsonb),
  public.trip_merge_legs(text, jsonb)
from public, anon;

grant execute on function
  public.trip_save(text, text, jsonb),
  public.trip_update_trip(text, jsonb),
  public.trip_set_base(text, jsonb),
  public.trip_update_place(text, text, jsonb),
  public.trip_set_booking(text, text, jsonb),
  public.trip_update_day(text, text, jsonb),
  public.trip_add_item(text, text, jsonb, integer),
  public.trip_update_item(text, text, jsonb),
  public.trip_move_item(text, text, text, integer),
  public.trip_remove_item(text, text),
  public.trip_add_cost(text, text, text, jsonb),
  public.trip_update_cost(text, text, text, text, jsonb),
  public.trip_merge_legs(text, jsonb)
to authenticated, service_role;

commit;
