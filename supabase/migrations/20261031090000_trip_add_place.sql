-- trip_add_place: lets Claude add a new place (e.g. a restaurant) to a trip without rewriting the document.
-- Same rules as the other trip_* writers: security invoker (RLS applies), search_path '', whitelist of keys.

create or replace function public.trip_add_place(p_trip text, p_place jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; p jsonb;
begin
  perform trip_private.check_keys(p_place, array['id','name','kind','area','parentId','priority','location','meetingPoint',
    'photos','duration','hours','transport','booking','costTemplate','links','notes','source']);
  p := jsonb_build_object(
         'parentId', null, 'priority', null, 'location', null, 'meetingPoint', null, 'photos', '[]'::jsonb,
         'duration', null, 'hours', null, 'transport', null, 'booking', null, 'costTemplate', '[]'::jsonb,
         'links', '[]'::jsonb, 'notes', null, 'source', jsonb_build_object('obsidianHeading', 'claude')
       ) || p_place;
  if coalesce(p ->> 'id', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'place id must be a slug'; end if;
  if coalesce(p ->> 'name', '') = '' then raise exception 'place name is required'; end if;
  if not coalesce(p ->> 'kind' = any(array['zone','attraction','museum','daytrip','event','nature','food']), false) then
    raise exception 'bad place kind %', p ->> 'kind';
  end if;
  if not coalesce(p ->> 'area' = any(array['sf','marin','east-bay','peninsula','south-bay','coast','napa','bay']), false) then
    raise exception 'bad place area %', p ->> 'area';
  end if;
  if jsonb_typeof(p -> 'location') = 'object'
     and (jsonb_typeof(p #> '{location,lat}') <> 'number' or jsonb_typeof(p #> '{location,lng}') <> 'number') then
    raise exception 'location needs numeric lat and lng';
  end if;
  if jsonb_typeof(p -> 'location') = 'object' then
    p := jsonb_set(p, '{location}', jsonb_build_object('name', null, 'address', null, 'googlePlaceId', null) || (p -> 'location'));
  end if;
  p := jsonb_set(p, '{costTemplate}', coalesce((
         select jsonb_agg(trip_private.normalize_cost(c)) from jsonb_array_elements(p -> 'costTemplate') c), '[]'::jsonb));
  d := trip_private.load(p_trip);
  if trip_private.idx(d -> 'places', 'id', p ->> 'id') is not null then raise exception 'place % already exists', p ->> 'id'; end if;
  if p ->> 'parentId' is not null and trip_private.idx(d -> 'places', 'id', p ->> 'parentId') is null then
    raise exception 'no place %', p ->> 'parentId';
  end if;
  d := jsonb_set(d, '{places}', (d -> 'places') || jsonb_build_array(p));
  perform trip_private.store(p_trip, d);
  return p;
end $$;

revoke execute on function public.trip_add_place(text, jsonb) from public, anon;
grant execute on function public.trip_add_place(text, jsonb) to authenticated, service_role;
