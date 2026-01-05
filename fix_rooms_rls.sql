-- Fix RLS policies to allow studio owners to manage rooms

-- 1. Drop the old policy that only had USING (blocks inserts)
drop policy if exists "Owners can manage their rooms" on public.rooms;

-- 2. Keep public read (already defined elsewhere as "Rooms are viewable by everyone")

-- 3. Allow owners to insert rooms in their studios
create policy "Owners can insert rooms"
  on public.rooms
  for insert
  with check (
    exists (
      select 1
      from public.studios
      where uuid = rooms.studio_id
        and owner_id = auth.uid()
    )
  );

-- 4. Allow owners to update rooms in their studios
create policy "Owners can update rooms"
  on public.rooms
  for update
  using (
    exists (
      select 1
      from public.studios
      where uuid = rooms.studio_id
        and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.studios
      where uuid = rooms.studio_id
        and owner_id = auth.uid()
    )
  );

-- 5. Allow owners to delete rooms in their studios
create policy "Owners can delete rooms"
  on public.rooms
  for delete
  using (
    exists (
      select 1
      from public.studios
      where uuid = rooms.studio_id
        and owner_id = auth.uid()
    )
  );