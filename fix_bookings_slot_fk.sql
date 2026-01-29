-- Convert appointment_slot to UUID and add Foreign Key constraint
ALTER TABLE public.bookings
  ALTER COLUMN appointment_slot TYPE uuid USING appointment_slot::uuid,
  ADD CONSTRAINT bookings_appointment_slot_fkey FOREIGN KEY (appointment_slot) REFERENCES public.slots(uuid);
