-- Allow users, instructors, and owners to view/update bookings (merged policies)
alter table public.bookings enable row level security;

drop policy if exists "Owners can view studio bookings" on public.bookings;
drop policy if exists "Instructors can view class bookings" on public.bookings;
drop policy if exists "Users can view own bookings." on public.bookings;
drop policy if exists "Bookings select access (merged)" on public.bookings;
create policy "Bookings select access (merged)"
  on public.bookings
  for select
  using (
    (select auth.uid()) = user_id
    or exists (
        select 1
        from public.slots
        join public.studios on studios.uuid = slots.studio_id
        where slots.uuid = bookings.appointment_slot::uuid
          and studios.owner_id = (select auth.uid())
      )
    or exists (
        select 1
        from public.slots
        where slots.uuid = bookings.appointment_slot::uuid
          and slots.trainer_id = (select auth.uid())
      )
  );

drop policy if exists "Owners can update studio bookings" on public.bookings;
drop policy if exists "Instructors can update class bookings" on public.bookings;
drop policy if exists "Users can update own bookings." on public.bookings;
drop policy if exists "Bookings update access (merged)" on public.bookings;
create policy "Bookings update access (merged)"
  on public.bookings
  for update
  using (
    (select auth.uid()) = user_id
    or exists (
        select 1
        from public.slots
        join public.studios on studios.uuid = slots.studio_id
        where slots.uuid = bookings.appointment_slot::uuid
          and studios.owner_id = (select auth.uid())
      )
    or exists (
        select 1
        from public.slots
        where slots.uuid = bookings.appointment_slot::uuid
          and slots.trainer_id = (select auth.uid())
      )
  );
