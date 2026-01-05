'use client';

import { supabase } from "./supabase";

export type Booking = {
  uuid: string;
  appointment_slot: string;
  status: string;
  booking_date?: string;
  attended?: boolean;
};

export async function createBooking(slotId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      appointment_slot: slotId,
      status: 'confirmed',
      booking_date: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function cancelBooking(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('uuid', bookingId);
    
  if (error) throw error;
}

export async function fetchUserBookings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data as Booking[];
}

export async function listBookings(params?: {
  status?: string;
  attended?: boolean;
  booking_date_from?: string;
  booking_date_to?: string;
  slotId?: string;
}) {
  let query = supabase.from('bookings').select('*');

  if (params?.status) query = query.eq('status', params.status);
  if (params?.attended !== undefined) query = query.eq('attended', params.attended);
  if (params?.slotId) query = query.eq('appointment_slot', params.slotId);

  const { data, error } = await query;
  if (error) throw error;

  return data as Booking[];
}

export type BookingWithUser = {
  uuid: string;
  status: string;
  attended?: boolean;
  booking_date?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
  } | null;
};

type BookingWithUserRow = Omit<BookingWithUser, "user"> & {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
  }[] | null;
};

export async function fetchSlotBookings(slotId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      uuid,
      status,
      attended,
      booking_date,
      user:profiles(id, first_name, last_name, email)
    `)
    .eq('appointment_slot', slotId);

  if (error) throw error;
  return ((data || []) as BookingWithUserRow[]).map((row) => ({
    ...row,
    user: row.user?.[0] ?? null
  }));
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
