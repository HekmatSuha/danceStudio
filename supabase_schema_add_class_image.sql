-- Add image url to slots for class cards
alter table public.slots
  add column if not exists image_url text;
