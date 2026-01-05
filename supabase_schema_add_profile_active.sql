-- Add active flag for profiles
alter table public.profiles
  add column if not exists is_active boolean default true;
