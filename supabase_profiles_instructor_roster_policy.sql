-- Allow instructors to read student profiles for their class rosters
alter table public.profiles enable row level security;

drop policy if exists "Instructors can view student profiles for their classes" on public.profiles;
create policy "Instructors can view student profiles for their classes"
  on public.profiles
  for select
  using (
    profiles.id = auth.uid()
    or exists (
      select 1
      from public.bookings
      join public.slots on slots.uuid = bookings.appointment_slot::uuid
      where bookings.user_id = profiles.id
        and slots.trainer_id = auth.uid()
    )
  );

