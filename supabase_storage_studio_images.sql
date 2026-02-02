-- Storage policies for studio images
-- Requires a bucket named "studio-images"

drop policy if exists "Public read access for studio images" on storage.objects;
create policy "Public read access for studio images"
  on storage.objects
  for select
  using (bucket_id = 'studio-images');

-- Allow authenticated users to upload studio images
drop policy if exists "Authenticated users can upload studio images" on storage.objects;
create policy "Authenticated users can upload studio images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'studio-images');

-- Allow authenticated users to update studio images
drop policy if exists "Authenticated users can update studio images" on storage.objects;
create policy "Authenticated users can update studio images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'studio-images');

-- Allow authenticated users to delete studio images
drop policy if exists "Authenticated users can delete studio images" on storage.objects;
create policy "Authenticated users can delete studio images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'studio-images');
