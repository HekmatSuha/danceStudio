-- Allow instructors to update their own slots (e.g., lock attendance)
alter table public.slots enable row level security;

drop policy if exists "Instructors can view own slots" on public.slots;
-- Select access is already public via "Enable read access for all users".

drop policy if exists "Instructors can update own slots" on public.slots;
drop policy if exists "Owners can update slots" on public.slots;
drop policy if exists "Slots update access (merged)" on public.slots;
create policy "Slots update access (merged)"
  on public.slots
  for update
  using (
    exists (
      select 1 from public.studios
      where uuid = slots.studio_id and owner_id = (select auth.uid())
    )
    or trainer_id = (select auth.uid())
  );
