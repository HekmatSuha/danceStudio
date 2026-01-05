-- Add currency to rooms
alter table public.rooms
  add column if not exists currency text default 'USD';
