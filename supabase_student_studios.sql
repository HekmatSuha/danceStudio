-- Link students to studios (for listing students without bookings)
create table public.student_studios (
  id uuid default uuid_generate_v4() primary key,
  studio_id uuid references public.studios(uuid) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (studio_id, student_id)
);

alter table public.student_studios enable row level security;

drop policy if exists "Owners can manage student links" on public.student_studios;
create policy "Owners can manage student links"
  on public.student_studios
  for all
  using (
    exists (
      select 1
      from public.studios
      where studios.uuid = student_studios.studio_id
        and studios.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can view student links" on public.student_studios;
create policy "Owners can view student links"
  on public.student_studios
  for select
  using (
    exists (
      select 1
      from public.studios
      where studios.uuid = student_studios.studio_id
        and studios.owner_id = auth.uid()
    )
  );

drop policy if exists "Students can view own studio links" on public.student_studios;
create policy "Students can view own studio links"
  on public.student_studios
  for select
  using (auth.uid() = student_id);
