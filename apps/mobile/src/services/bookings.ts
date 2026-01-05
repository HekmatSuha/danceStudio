import { supabase } from "../lib/supabase";

export type Booking = {
  uuid: string;
  appointment_slot: string;
  status: string;
  booking_date?: string;
  price?: string;
  attended?: boolean;
  client_notes?: string;
};

export async function createBooking(slotId: string, notes?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      appointment_slot: slotId,
      client_notes: notes ?? "",
      status: 'confirmed', // defaulting to confirmed for now
      booking_date: new Date().toISOString(), // This should ideally come from the slot, but for now using current time or we need to fetch slot details
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
}) {
  let query = supabase.from('bookings').select('*');

  if (params?.status) {
    query = query.eq('status', params.status);
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

  const { data, error } = await query;

  if (error) throw error;

  return data.map((b: any) => ({
    uuid: b.uuid,
    appointment_slot: b.appointment_slot,
    status: b.status,
    booking_date: b.booking_date,
    attended: b.attended,
  })) as Booking[];
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
