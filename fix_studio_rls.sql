-- Fix RLS policies to allow Owners and Super Admins to DELETE and UPDATE studios

-- 1. Drop existing restricted policies
drop policy if exists "Enable update for owners" on public.studios;
drop policy if exists "Enable insert for super admins" on public.studios;

-- 2. Create comprehensive policies

-- UPDATE: Owners and Super Admins
create policy "Enable update for owners and admins" 
  on public.studios 
  for update 
  using ( 
    auth.uid() = owner_id 
    OR 
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- DELETE: Owners and Super Admins
create policy "Enable delete for owners and admins" 
  on public.studios 
  for delete 
  using ( 
    auth.uid() = owner_id 
    OR 
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- INSERT: Super Admins only (as per previous logic)
create policy "Enable insert for super admins" 
  on public.studios 
  for insert 
  with check ( 
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- SELECT: Public (already exists as "Enable read access for all users")
-- If not, ensure it exists:
-- create policy "Enable read access for all users" on public.studios for select using (true);
