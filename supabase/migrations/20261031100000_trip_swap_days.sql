-- trip_swap_days: exchange the plans of two days (title, kind, status, cover, notes, costs, items);
-- the dates stay in place. Lets Claude reorder the itinerary in one validated call.

create or replace function public.trip_swap_days(p_trip text, p_a text, p_b text)
returns jsonb language plpgsql set search_path = '' as $$
declare d jsonb; ia integer; ib integer; da jsonb; db jsonb;
begin
  d := trip_private.load(p_trip);
  ia := trip_private.idx(d -> 'days', 'date', p_a);
  ib := trip_private.idx(d -> 'days', 'date', p_b);
  if ia is null then raise exception 'no day %', p_a; end if;
  if ib is null then raise exception 'no day %', p_b; end if;
  if ia = ib then return jsonb_build_object('a', p_a, 'b', p_b); end if;
  da := d -> 'days' -> ia;
  db := d -> 'days' -> ib;
  d := jsonb_set(d, array['days', ia::text], db || jsonb_build_object('date', p_a));
  d := jsonb_set(d, array['days', ib::text], da || jsonb_build_object('date', p_b));
  perform trip_private.store(p_trip, d);
  return jsonb_build_object('a', p_a, 'title_a', db ->> 'title', 'b', p_b, 'title_b', da ->> 'title');
end $$;

revoke execute on function public.trip_swap_days(text, text, text) from public, anon;
grant execute on function public.trip_swap_days(text, text, text) to authenticated, service_role;
