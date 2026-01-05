-- 1. Update Profiles to allow 'super_admin' role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
  check (role in ('owner', 'instructor', 'student', 'super_admin'));

-- 2. Allow Super Admins to create Studios
-- First, drop existing insert policy if any (unlikely based on previous setup)
drop policy if exists "Enable insert for super admins" on public.studios;

-- Create policy allowing only super_admins to insert studios
create policy "Enable insert for super admins" 
  on public.studios 
  for insert 
  with check ( 
    exists (
      select 1 from public.profiles 
      where id = auth.uid() 
      and role = 'super_admin'
    )
  );

-- OPTIONAL: If you want Studio Owners to create their own studios (Self-Service), 
-- you can use this instead:
-- create policy "Enable insert for authenticated users" 
--   on public.studios 
--   for insert 
--   with check ( auth.role() = 'authenticated' );


-- 3. Helper to promote a user to Super Admin
-- REPLACE 'your-email@example.com' with the actual email of the user you want to promote.
-- You can run this block separately in the SQL Editor after the user has signed up.

/* 
update public.profiles 
set role = 'super_admin' 
where email = 'your-email@example.com';
*/
