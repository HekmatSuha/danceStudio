-- Auto-link students to studios when a booking is created
create or replace function public.link_student_to_studio_from_booking()
returns trigger
language plpgsql
as $$
declare
  slot_uuid uuid;
  studio_uuid uuid;
begin
  begin
    slot_uuid := new.appointment_slot::uuid;
  exception when invalid_text_representation then
    return new;
  end;

  select studio_id into studio_uuid
  from public.slots
  where uuid = slot_uuid
  limit 1;

  if studio_uuid is null then
    return new;
  end if;

  insert into public.student_studios (studio_id, student_id)
  values (studio_uuid, new.user_id)
  on conflict (studio_id, student_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_booking_link_student on public.bookings;
create trigger on_booking_link_student
after insert on public.bookings
for each row execute function public.link_student_to_studio_from_booking();
