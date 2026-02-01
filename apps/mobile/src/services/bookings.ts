import { supabase } from "../lib/supabase";

export type Booking = {
  uuid: string;
  appointment_slot: string;
  status: string;
  booking_date?: string;
  price?: string;
  attended?: boolean;
  client_notes?: string;
  slot?: {
    uuid: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    price?: string | null;
    currency?: string | null;
    image_url?: string | null;
    studio_details?: { name?: string; city?: string; address?: string };
    trainer_details?: { trainer_details?: { first_name?: string; last_name?: string } };
    dance_style_details?: { name?: string } | null;
  };
};

export async function createBooking(slotId: string, notes?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("start_time")
    .eq("uuid", slotId)
    .single();

  if (slotError || !slot) {
    throw new Error("Slot not found");
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      appointment_slot: slotId,
      client_notes: notes ?? "",
      status: 'pending',
      booking_date: slot.start_time,
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    uuid: data.uuid,
    appointment_slot: data.appointment_slot,
    status: data.status,
    booking_date: data.booking_date,
    attended: data.attended,
  } as Booking;
}

export async function listBookings(params?: {
  status?: string;
  attended?: boolean;
  booking_date_from?: string;
  booking_date_to?: string;
  appointment_slot?: string;
}) {
  let query = supabase
    .from('bookings')
    .select(`
      uuid,
      appointment_slot,
      status,
      booking_date,
      price,
      attended,
      client_notes,
      slot:slots(
        uuid,
        title,
        description,
        start_time,
        end_time,
        price,
        currency,
        image_url,
        studio:studios(name, city, address),
        trainer:profiles(first_name, last_name),
        dance_style:dance_styles(name)
      )
    `);

  if (params?.status) {
    query = query.eq('status', params.status);
  }
  if (params?.appointment_slot) {
    query = query.eq('appointment_slot', params.appointment_slot);
  }
  if (params?.attended !== undefined) {
    query = query.eq('attended', params.attended);
  }
  if (params?.booking_date_from) {
    query = query.gte('booking_date', params.booking_date_from);
  }
  if (params?.booking_date_to) {
    query = query.lte('booking_date', params.booking_date_to);
  }

  let { data, error } = await query;

  if (error) {
    const fallback = await supabase.from('bookings').select('*');
    if (fallback.error) throw error;
    data = fallback.data as any;
  }

  const base = data.map((b: any) => ({
    uuid: b.uuid,
    appointment_slot: b.appointment_slot,
    status: b.status,
    booking_date: b.booking_date,
    attended: b.attended,
    price: b.price?.toString(),
    client_notes: b.client_notes,
    slot: b.slot
      ? {
          uuid: b.slot.uuid,
          title: b.slot.title,
          description: b.slot.description,
          start_time: b.slot.start_time,
          end_time: b.slot.end_time,
          price: b.slot.price?.toString(),
          currency: b.slot.currency ?? null,
          image_url: b.slot.image_url ?? null,
          studio_details: b.slot.studio ?? undefined,
          trainer_details: b.slot.trainer
            ? { trainer_details: b.slot.trainer }
            : undefined,
          dance_style_details: b.slot.dance_style ?? null,
        }
      : undefined,
  })) as Booking[];

  const missingSlotIds = Array.from(
    new Set(base.filter((b) => !b.slot && b.appointment_slot).map((b) => b.appointment_slot)),
  );
  if (missingSlotIds.length === 0) return base;

  const { data: slotsData } = await supabase
    .from("slots")
    .select(`
      uuid,
      title,
      description,
      start_time,
      end_time,
      price,
      currency,
      image_url,
      studio:studios(name, city, address),
      trainer:profiles(first_name, last_name),
      dance_style:dance_styles(name)
    `)
    .in("uuid", missingSlotIds);

  const slotMap = new Map(
    (slotsData ?? []).map((slot: any) => [
      slot.uuid,
      {
        uuid: slot.uuid,
        title: slot.title,
        description: slot.description,
        start_time: slot.start_time,
        end_time: slot.end_time,
        price: slot.price?.toString(),
        currency: slot.currency ?? null,
        image_url: slot.image_url ?? null,
        studio_details: slot.studio ?? undefined,
        trainer_details: slot.trainer ? { trainer_details: slot.trainer } : undefined,
        dance_style_details: slot.dance_style ?? null,
      },
    ]),
  );

  return base.map((b) => (b.slot ? b : { ...b, slot: slotMap.get(b.appointment_slot) }));
}

export async function markAttendance(bookingId: string, attended: boolean) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ attended })
    .eq('uuid', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelBooking(bookingId: string) {
  // We can either delete or set status to cancelled
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('uuid', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
