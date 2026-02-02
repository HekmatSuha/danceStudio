-- Add optional studio image URL
alter table public.studios add column if not exists image_url text;
