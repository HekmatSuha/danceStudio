-- Storage policies for studio images
-- Requires a bucket named "studio-images"

drop policy if exists "Public read access for studio images" on storage.objects;
create policy "Public read access for studio images"
  on storage.objects
  for select
  using (bucket_id = 'studio-images');
