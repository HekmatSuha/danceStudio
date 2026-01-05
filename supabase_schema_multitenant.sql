-- 1. Rooms (The Resource)
create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  studio_id uuid references public.studios(uuid) not null,
  name text not null,
  capacity integer default 20,
  price_per_hour numeric(10, 2), -- For external rentals
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tenant Staff (Linking Instructors to Studios)
create table public.tenant_staff (
  id uuid default uuid_generate_v4() primary key,
  studio_id uuid references public.studios(uuid) not null,
  user_id uuid references public.profiles(id) not null,
  role text default 'instructor', -- 'instructor', 'admin', 'receptionist'
  commission_rate numeric(5, 2), -- e.g., 40.00 for 40%
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(studio_id, user_id)
);

-- 3. Room Rentals (For Independent Trainers)
create table public.room_rentals (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) not null,
  renter_id uuid references public.profiles(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  total_price numeric(10, 2),
  status text default 'pending', -- 'pending', 'confirmed', 'paid', 'cancelled'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Update Slots to link to Rooms (Studio Classes)
-- We add room_id to slots. 
alter table public.slots add column room_id uuid references public.rooms(id);

-- 5. Fix Bookings to reference Slots properly
-- (If strictly needed, we can alter the column type, but 'text' works for UUIDs loosely. 
--  Let's add a proper FK constraint if possible, but existing data might violate it if we had any.
--  Assuming fresh start or compatible data).
-- alter table public.bookings alter column appointment_slot type uuid using appointment_slot::uuid;
-- alter table public.bookings add constraint bookings_appointment_slot_fkey foreign key (appointment_slot) references public.slots(uuid);


-- Enable RLS
alter table public.rooms enable row level security;
alter table public.tenant_staff enable row level security;
alter table public.room_rentals enable row level security;

-- Policies

-- Rooms: Public read, Owner write
create policy "Rooms are viewable by everyone" on public.rooms for select using (true);
create policy "Owners can manage their rooms" on public.rooms for all 
  using ( exists (select 1 from public.studios where uuid = rooms.studio_id and owner_id = auth.uid()) );

-- Tenant Staff: Public read (to see who works where), Owner/Admin manage
create policy "Staff list is viewable by everyone" on public.tenant_staff for select using (true);
create policy "Owners can manage staff" on public.tenant_staff for all
  using ( exists (select 1 from public.studios where uuid = tenant_staff.studio_id and owner_id = auth.uid()) );

-- Room Rentals: Renter can view/create own. Owner can view all for their studio.
create policy "Renters can view own rentals" on public.room_rentals for select using (auth.uid() = renter_id);
create policy "Renters can create rentals" on public.room_rentals for insert with check (auth.uid() = renter_id);
create policy "Studio owners can view rentals in their rooms" on public.room_rentals for select 
  using ( exists (
    select 1 from public.rooms 
    join public.studios on rooms.studio_id = studios.uuid 
    where rooms.id = room_rentals.room_id and studios.owner_id = auth.uid()
  ));

-- Availability Function (Prevent Double Booking)
create or replace function check_room_availability(target_room_id uuid, check_start timestamp with time zone, check_end timestamp with time zone)
returns boolean
language plpgsql
as $$
declare
  conflict_count integer;
begin
  -- Check for conflicting Class Slots
  select count(*) into conflict_count
  from public.slots
  where room_id = target_room_id
    and (
      (start_time < check_end and end_time > check_start)
    );
    
  if conflict_count > 0 then
    return false;
  end if;

  -- Check for conflicting Rentals
  select count(*) into conflict_count
  from public.room_rentals
  where room_id = target_room_id
    and status in ('confirmed', 'paid', 'pending')
    and (
      (start_time < check_end and end_time > check_start)
    );

  if conflict_count > 0 then
    return false;
  end if;

  return true;
end;
$$;
