-- Add currency to slots
alter table public.slots
  add column if not exists currency text default 'USD';
