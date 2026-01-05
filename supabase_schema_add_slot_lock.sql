-- Add lock flag for slots (classes)
alter table public.slots
  add column if not exists is_locked boolean default false;
