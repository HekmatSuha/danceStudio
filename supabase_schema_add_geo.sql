-- Add latitude/longitude to studios for map display
alter table public.studios
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6);
