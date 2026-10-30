-- 0002_trip_media.sql
-- Private bucket for trip photos. The browser reads them through short-lived signed URLs;
-- uploads happen from a local script with the service role key (never from the browser).

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-media', 'trip-media', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "Admins read trip media" on storage.objects;
create policy "Admins read trip media" on storage.objects
for select to authenticated
using (bucket_id = 'trip-media'
       and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "Admins write trip media" on storage.objects;
create policy "Admins write trip media" on storage.objects
for insert to authenticated
with check (bucket_id = 'trip-media'
            and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "Admins update trip media" on storage.objects;
create policy "Admins update trip media" on storage.objects
for update to authenticated
using (bucket_id = 'trip-media'
       and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
with check (bucket_id = 'trip-media'
            and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

commit;
