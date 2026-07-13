insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-images',
  'vehicle-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Demo read vehicle images" on storage.objects;
drop policy if exists "Demo insert vehicle images" on storage.objects;
drop policy if exists "Demo update vehicle images" on storage.objects;
drop policy if exists "Demo delete vehicle images" on storage.objects;

create policy "Demo read vehicle images"
on storage.objects for select
using (bucket_id = 'vehicle-images');

create policy "Demo insert vehicle images"
on storage.objects for insert
with check (bucket_id = 'vehicle-images');

create policy "Demo update vehicle images"
on storage.objects for update
using (bucket_id = 'vehicle-images');

create policy "Demo delete vehicle images"
on storage.objects for delete
using (bucket_id = 'vehicle-images');
