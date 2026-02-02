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
      status: 'pending',
      booking_date: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  try {
    const { data: slotRow } = await supabase
      .from("slots")
      .select("studio_id")
      .eq("uuid", slotId)
      .single();
    if (slotRow?.studio_id) {
      await supabase
        .from("student_studios")
        .upsert(
          { studio_id: slotRow.studio_id, student_id: user.id },
          { onConflict: "studio_id,student_id" }
        );
    }
  } catch {
    // Non-blocking: chat contacts should still work when policy allows.
  }
  clearCacheByPrefix("bookings:");
  return data as Booking;
}

export async function createBookingForStudent(
  slotId: string,
  userId: string,
  status = "confirmed"
) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: userId,
      appointment_slot: slotId,
      status,
      booking_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  try {
    const { data: slotRow } = await supabase
      .from("slots")
      .select("studio_id")
      .eq("uuid", slotId)
      .single();
    if (slotRow?.studio_id) {
      await supabase
        .from("student_studios")
        .upsert(
          { studio_id: slotRow.studio_id, student_id: userId },
          { onConflict: "studio_id,student_id" }
        );
    }
  } catch {
    // Non-blocking: owner policy might already cover this.
  }
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
      .select('uuid, appointment_slot, status, booking_date, attended')
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
      .select(params?.select || 'uuid, appointment_slot, status, booking_date, attended, user_id');

    if (params?.studioIds?.length) {
      const { data: slotRows, error: slotError } = await supabase
        .from("slots")
        .select("uuid")
        .in("studio_id", params.studioIds);

      if (slotError) throw slotError;

      const slotIds = (slotRows as Array<{ uuid: string }> | null | undefined)?.map((row) => row.uuid) ?? [];
      if (slotIds.length === 0) return [];
      query = query.in("appointment_slot", slotIds);
    }

    if (params?.status) query = query.eq('status', params.status);
    if (params?.attended !== undefined) query = query.eq('attended', params.attended);
    if (params?.slotId) query = query.eq('appointment_slot', params.slotId);
    if (params?.booking_date_from) query = query.gte('booking_date', params.booking_date_from);
    if (params?.booking_date_to) query = query.lte('booking_date', params.booking_date_to);

    const { data, error } = await query.returns<Booking[]>();
    if (error) throw error;

    return data || [];
  });
}

export type BookingWithUser = {
  uuid: string;
  user_id?: string | null;
  status: string;
  attended?: boolean;
  booking_date?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    username?: string | null;
    email?: string | null;
    phone_number?: string | null;
  } | null;
};

type BookingWithUserRow = Omit<BookingWithUser, "user"> & {
  user:
    | {
        id: string;
        first_name: string;
        last_name: string;
        username?: string | null;
        email?: string | null;
        phone_number?: string | null;
      }
    | {
        id: string;
        first_name: string;
        last_name: string;
        username?: string | null;
        email?: string | null;
        phone_number?: string | null;
      }[]
    | null;
};

export async function fetchSlotBookings(slotId: string) {
  const normalizeUser = (user: BookingWithUserRow["user"]) =>
    Array.isArray(user) ? user[0] ?? null : user ?? null;

  const mapRows = (rows: BookingWithUserRow[]) =>
    (rows || []).map((row) => ({
      ...row,
      user: normalizeUser(row.user),
    }));

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const res = await fetch(`/api/instructor/roster/${slotId}`, { headers });
    if (res.ok) {
      const payload = (await res.json()) as BookingWithUserRow[];
      return mapRows(payload);
    }
  } catch {
    // Fall back to client-side query below.
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      uuid,
      user_id,
      status,
      attended,
      booking_date,
      user:profiles(id, first_name, last_name, username, email, phone_number)
    `)
    .eq('appointment_slot', slotId);

  if (error) throw error;
  return mapRows((data || []) as BookingWithUserRow[]);
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
