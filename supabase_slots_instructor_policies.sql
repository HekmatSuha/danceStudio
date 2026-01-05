-- Allow instructors to update their own slots (e.g., lock attendance)
alter table public.slots enable row level security;

drop policy if exists "Instructors can update own slots" on public.slots;
create policy "Instructors can update own slots"
  on public.slots
  for update
  using (trainer_id = auth.uid());
