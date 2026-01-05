'use client';

import { supabase } from "./supabase";
import { clearCacheByPrefix, withCache } from "./cache";

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
  clearCacheByPrefix("bookings:");
  return data as Booking;
}

export async function cancelBooking(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('uuid', bookingId);
    
  if (error) throw error;
  clearCacheByPrefix("bookings:");
}

export async function fetchUserBookings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return withCache(`bookings:user:${user.id}`, 15000, async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .returns<Booking[]>();

    if (error) throw error;
    return data || [];
  });
}

export async function listBookings(params?: {
  status?: string;
  attended?: boolean;
  booking_date_from?: string;
  booking_date_to?: string;
  slotId?: string;
  studioIds?: string[];
  select?: string;
}) {
  const cacheKey = `bookings:${JSON.stringify(params || {})}`;
  return withCache(cacheKey, 15000, async () => {
    let query = supabase
      .from('bookings')
      .select(params?.select || '*')
      .returns<Booking[]>();

    if (params?.studioIds?.length) {
      const { data: slotRows, error: slotError } = await supabase
        .from("slots")
        .select("uuid")
        .in("studio_id", params.studioIds);

      if (slotError) throw slotError;

      const slotIds = (slotRows || []).map((row: any) => row.uuid);
      if (slotIds.length === 0) return [];
      query = query.in("appointment_slot", slotIds);
    }

    if (params?.status) query = query.eq('status', params.status);
    if (params?.attended !== undefined) query = query.eq('attended', params.attended);
    if (params?.slotId) query = query.eq('appointment_slot', params.slotId);

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  });
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
  clearCacheByPrefix("bookings:");
  return data;
}
