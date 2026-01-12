-- Add class level to slots
alter table public.slots
  add column if not exists level text default 'all';
