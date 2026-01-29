-- Allow instructors to view/update bookings for their classes
alter table public.bookings enable row level security;

drop policy if exists "Instructors can view class bookings" on public.bookings;
create policy "Instructors can view class bookings"
  on public.bookings
  for select
  using (
    exists (
      select 1
      from public.slots
      where slots.uuid = bookings.appointment_slot::uuid
        and slots.trainer_id = (select auth.uid())
    )
  );

drop policy if exists "Instructors can update class bookings" on public.bookings;
create policy "Instructors can update class bookings"
  on public.bookings
  for update
  using (
    exists (
      select 1
      from public.slots
      where slots.uuid = bookings.appointment_slot::uuid
        and slots.trainer_id = (select auth.uid())
    )
  );
