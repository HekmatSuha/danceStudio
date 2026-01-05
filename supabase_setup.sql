-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Profiles Table (Public Profile Information)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  username text,
  first_name text,
  last_name text,
  phone_number text,
  role text check (role in ('owner', 'instructor', 'student')),
  gender text,
  dance_level text,
  interests text[],
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profile Policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, first_name, last_name, role, phone_number, gender)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'role',
    new.raw_user_meta_data ->> 'phone_number',
    new.raw_user_meta_data ->> 'gender'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Bookings Table
create table public.bookings (
  uuid uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  appointment_slot text, -- Storing as text for now to match old ID usage, or change to UUID if slot is a table
  status text default 'pending',
  client_notes text,
  attended boolean default false,
  booking_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Bookings
alter table public.bookings enable row level security;

create policy "Users can view own bookings."
  on bookings for select
  using ( auth.uid() = user_id );

create policy "Users can create own bookings."
  on bookings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own bookings."
  on bookings for update
  using ( auth.uid() = user_id );
