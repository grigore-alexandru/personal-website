-- trip_set_item_routes: replace the step-by-step routes ("to" = getting there, "from" = going back) of one item.
-- Routes are shown as dropdowns on the activity. Validated like the other trip_* writers.

create or replace function public.trip_set_item_routes(p_trip text, p_item_id text, p_routes jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; r record; rt jsonb; st jsonb; out_routes jsonb := '[]'::jsonb; ids text[] := '{}';
begin
  if p_routes is null or jsonb_typeof(p_routes) <> 'array' then raise exception 'routes must be an array'; end if;
  for rt in select value from jsonb_array_elements(p_routes) loop
    perform trip_private.check_keys(rt, array['id','direction','title','summary','destination','steps','notes']);
    rt := jsonb_build_object('summary', null, 'destination', null, 'notes', null, 'steps', '[]'::jsonb) || rt;
    if coalesce(rt ->> 'id', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'route id must be a slug'; end if;
    if rt ->> 'id' = any(ids) then raise exception 'duplicate route id %', rt ->> 'id'; end if;
    ids := ids || (rt ->> 'id');
    if not coalesce(rt ->> 'direction' = any(array['to','from']), false) then raise exception 'route direction must be to or from'; end if;
    if coalesce(rt ->> 'title', '') = '' then raise exception 'route title is required'; end if;
    if jsonb_typeof(rt -> 'steps') <> 'array' then raise exception 'route steps must be an array'; end if;
    for st in select value from jsonb_array_elements(rt -> 'steps') loop
      perform trip_private.check_keys(st, array['mode','text','durationMin']);
      if not coalesce(st ->> 'mode' = any(array['walk','bart','caltrain','muni','bus','ferry','car','plane','other']), false) then
        raise exception 'bad step mode %', st ->> 'mode';
      end if;
      if coalesce(st ->> 'text', '') = '' then raise exception 'step text is required'; end if;
      perform trip_private.check_int(st -> 'durationMin', 'durationMin', 0);
    end loop;
    out_routes := out_routes || jsonb_build_array(rt);
  end loop;

  d := trip_private.load(p_trip);
  select * into r from trip_private.find_item(d, p_item_id);
  if r.day_idx is null then raise exception 'no item %', p_item_id; end if;
  d := jsonb_set(d, array['days', r.day_idx::text, 'items', r.item_idx::text, 'routes'], out_routes);
  perform trip_private.store(p_trip, d);
  return out_routes;
end $$;

revoke execute on function public.trip_set_item_routes(text, text, jsonb) from public, anon;
grant execute on function public.trip_set_item_routes(text, text, jsonb) to authenticated, service_role;
