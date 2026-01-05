-- Allow studio owners to manage slots (classes) in their studios
alter table public.slots enable row level security;

drop policy if exists "Owners can insert slots" on public.slots;
create policy "Owners can insert slots"
  on public.slots
  for insert
  with check (
    exists (
      select 1 from public.studios
      where uuid = slots.studio_id and owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update slots" on public.slots;
create policy "Owners can update slots"
  on public.slots
  for update
  using (
    exists (
      select 1 from public.studios
      where uuid = slots.studio_id and owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can delete slots" on public.slots;
create policy "Owners can delete slots"
  on public.slots
  for delete
  using (
    exists (
      select 1 from public.studios
      where uuid = slots.studio_id and owner_id = auth.uid()
    )
  );
