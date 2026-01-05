-- Allow studio owners to update profiles of their instructors/staff
alter table public.profiles enable row level security;

drop policy if exists "Owners can update studio staff profiles" on public.profiles;
create policy "Owners can update studio staff profiles"
  on public.profiles
  for update
  using (
    exists (
      select 1
      from public.tenant_staff ts
      join public.studios s on s.uuid = ts.studio_id
      where ts.user_id = profiles.id
        and s.owner_id = auth.uid()
    )
  );
