-- Fix for deleting studios by adding cascading deletes to foreign keys

-- 1. Drop existing foreign keys that block deletion
alter table public.tenant_staff drop constraint if exists tenant_staff_studio_id_fkey;
alter table public.rooms drop constraint if exists rooms_studio_id_fkey;
alter table public.slots drop constraint if exists slots_studio_id_fkey;
-- If reviews link to studios directly:
alter table public.reviews drop constraint if exists reviews_studio_id_fkey;

-- 2. Re-add foreign keys with ON DELETE CASCADE
-- This ensures that when a studio is deleted, all its staff, rooms, classes, and reviews are also deleted.

-- Link Tenant Staff to Studio (Cascade)
alter table public.tenant_staff 
  add constraint tenant_staff_studio_id_fkey 
  foreign key (studio_id) 
  references public.studios(uuid) 
  on delete cascade;

-- Link Rooms to Studio (Cascade)
alter table public.rooms 
  add constraint rooms_studio_id_fkey 
  foreign key (studio_id) 
  references public.studios(uuid) 
  on delete cascade;

-- Link Slots to Studio (Cascade)
alter table public.slots 
  add constraint slots_studio_id_fkey 
  foreign key (studio_id) 
  references public.studios(uuid) 
  on delete cascade;

-- Link Reviews to Studio (Cascade)
alter table public.reviews 
  add constraint reviews_studio_id_fkey 
  foreign key (studio_id) 
  references public.studios(uuid) 
  on delete cascade;

-- Note: We also need to handle second-level dependencies.
-- E.g. room_rentals -> rooms. If a room is deleted (via studio delete), its rentals should go too.
alter table public.room_rentals drop constraint if exists room_rentals_room_id_fkey;
alter table public.room_rentals 
  add constraint room_rentals_room_id_fkey 
  foreign key (room_id) 
  references public.rooms(id) 
  on delete cascade;

-- slots -> rooms? Usually slots reference rooms.
-- If slots table has room_id fk:
alter table public.slots drop constraint if exists slots_room_id_fkey;
alter table public.slots 
  add constraint slots_room_id_fkey 
  foreign key (room_id) 
  references public.rooms(id) 
  on delete cascade;

-- bookings -> slots?
-- If a slot is deleted (via studio delete), bookings should go too.
-- The current schema for bookings has `appointment_slot` as text or uuid?
-- Let's assume it might be a foreign key or we should make it one.
-- If it's text, the database won't block it, but data will be orphaned.
-- If it's a constraint, we need cascade.
-- Checking previous files, we didn't strictly enforce booking FK in some versions, but if it exists:
-- alter table public.bookings drop constraint if exists bookings_appointment_slot_fkey;
-- alter table public.bookings 
--   add constraint bookings_appointment_slot_fkey 
--   foreign key (appointment_slot) 
--   references public.slots(uuid) 
--   on delete cascade;
