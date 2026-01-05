-- Allow owners to manage student profiles
alter table public.profiles enable row level security;

drop policy if exists "Owners can update student profiles" on public.profiles;
create policy "Owners can update student profiles"
  on public.profiles
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'owner'
    )
    and profiles.role = 'student'
  );

drop policy if exists "Owners can delete student profiles" on public.profiles;
create policy "Owners can delete student profiles"
  on public.profiles
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'owner'
    )
    and profiles.role = 'student'
  );
