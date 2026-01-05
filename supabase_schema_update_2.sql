-- Dance Styles
create table public.dance_styles (
  uuid uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Studios
create table public.studios (
  uuid uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  city text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  owner_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Slots
create table public.slots (
  uuid uuid default uuid_generate_v4() primary key,
  title text,
  description text,
  studio_id uuid references public.studios(uuid),
  trainer_id uuid references public.profiles(id),
  dance_style_id uuid references public.dance_styles(uuid),
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  price numeric(10, 2),
  max_participants integer default 20,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reviews
create table public.reviews (
  uuid uuid default uuid_generate_v4() primary key,
  studio_id uuid references public.studios(uuid),
  user_id uuid references public.profiles(id),
  booking_id uuid references public.bookings(uuid),
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  studio_response text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.dance_styles enable row level security;
alter table public.studios enable row level security;
alter table public.slots enable row level security;
alter table public.reviews enable row level security;

-- Policies (Public Read)
create policy "Enable read access for all users" on public.dance_styles for select using (true);
create policy "Enable read access for all users" on public.studios for select using (true);
create policy "Enable read access for all users" on public.slots for select using (true);
create policy "Enable read access for all users" on public.reviews for select using (true);

-- Policies (Authenticated Create/Update - simplified for now)
create policy "Enable insert for authenticated users only" on public.reviews for insert with check (auth.role() = 'authenticated');
create policy "Enable update for owners" on public.studios for update using (auth.uid() = owner_id);

-- Link trainers to studios (Simplified: Many-to-Many or One-to-Many via studio_id in profiles? 
-- Let's add a studio_id to profiles for simplicity for 'instructor' role, or just rely on slots to link them).
-- For this migration, we will infer trainers from profiles with role 'instructor'.
