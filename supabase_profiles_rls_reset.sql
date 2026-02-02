-- Reset profiles RLS policies to avoid recursion issues
alter table public.profiles enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

create policy "Profiles are readable by authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Owners can update staff profiles"
  on public.profiles
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.tenant_staff ts
      join public.studios s on s.uuid = ts.studio_id
      where ts.user_id = profiles.id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_staff ts
      join public.studios s on s.uuid = ts.studio_id
      where ts.user_id = profiles.id
        and s.owner_id = auth.uid()
    )
  );
