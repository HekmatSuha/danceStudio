-- Allow studio owners to view and update bookings for their classes
alter table public.bookings enable row level security;

drop policy if exists "Owners can view studio bookings" on public.bookings;
create policy "Owners can view studio bookings"
  on public.bookings
  for select
  using (
    exists (
      select 1
      from public.slots
      join public.studios on studios.uuid = slots.studio_id
      where slots.uuid = bookings.appointment_slot
        and studios.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update studio bookings" on public.bookings;
create policy "Owners can update studio bookings"
  on public.bookings
  for update
  using (
    exists (
      select 1
      from public.slots
      join public.studios on studios.uuid = slots.studio_id
      where slots.uuid = bookings.appointment_slot
        and studios.owner_id = auth.uid()
    )
  );
