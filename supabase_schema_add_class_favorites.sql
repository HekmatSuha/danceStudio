-- Class favorites per student
create table if not exists public.class_favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  slot_id uuid references public.slots(uuid) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, slot_id)
);

alter table public.class_favorites enable row level security;

drop policy if exists "Users can read own class favorites" on public.class_favorites;
create policy "Users can read own class favorites"
  on public.class_favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own class favorites" on public.class_favorites;
create policy "Users can insert own class favorites"
  on public.class_favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own class favorites" on public.class_favorites;
create policy "Users can delete own class favorites"
  on public.class_favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);
