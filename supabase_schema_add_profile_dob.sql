-- Add date of birth to profiles for instructor birthdays
alter table public.profiles
  add column if not exists date_of_birth date;
