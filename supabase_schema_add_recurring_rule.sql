-- Add recurrence rule storage for slots
alter table public.slots
  add column if not exists recurring_rule text;
