import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../../lib/server-supabase";

type StudioIdRow = { studio_id?: string | null };
type OwnedStudioRow = { uuid?: string | null };
type SlotRow = {
  uuid: string;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price?: number | null;
  currency?: string | null;
  studio_id?: string | null;
  studio?: { name?: string | null } | null;
};
type BookingRow = {
  uuid: string;
  status?: string | null;
  booking_date?: string | null;
  appointment_slot?: string | null;
  user_id?: string | null;
};
type ProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
};

async function resolveStudios(auth: NonNullable<Awaited<ReturnType<typeof getAuthedSupabaseClient>>>) {
  const { data: staffData } = await auth.supabase
    .from("tenant_staff")
    .select("studio_id")
    .eq("user_id", auth.userId);

  const { data: ownedData } = await auth.supabase
    .from("studios")
    .select("uuid")
    .eq("owner_id", auth.userId);

  const ids = new Set<string>();
  (staffData as StudioIdRow[] | null | undefined)?.forEach((row) => {
    if (row.studio_id) ids.add(row.studio_id);
  });
  (ownedData as OwnedStudioRow[] | null | undefined)?.forEach((row) => {
    if (row.uuid) ids.add(row.uuid);
  });
  return Array.from(ids);
}

export async function GET(req: NextRequest) {
  const auth = await getAuthedSupabaseClient(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studioIdsParam = req.nextUrl.searchParams.get("studioIds");
  const allowedStudioIds = await resolveStudios(auth);
  const requestedIds = studioIdsParam
    ? studioIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : allowedStudioIds;
  const studioIds = requestedIds.filter((id) => allowedStudioIds.includes(id));

  if (studioIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: slotRows, error: slotError } = await auth.supabase
    .from("slots")
    .select("uuid, title, start_time, end_time, price, currency, studio_id, studio:studios(name)")
    .in("studio_id", studioIds);

  if (slotError) {
    return NextResponse.json({ error: slotError.message }, { status: 500 });
  }

  const slots = (slotRows as SlotRow[] | null | undefined) ?? [];
  const slotIds = slots.map((slot) => slot.uuid);
  if (slotIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: bookingRows, error: bookingError } = await auth.supabase
    .from("bookings")
    .select("uuid, status, booking_date, appointment_slot, user_id")
    .eq("status", "pending")
    .in("appointment_slot", slotIds);

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  const bookings = (bookingRows as BookingRow[] | null | undefined) ?? [];
  const userIds = bookings.map((b) => b.user_id).filter(Boolean) as string[];
  const { data: profileRows, error: profileError } = userIds.length
    ? await auth.supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone_number")
        .in("id", userIds)
    : { data: [], error: null };

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const profileMap = new Map<string, ProfileRow>();
  (profileRows as ProfileRow[] | null | undefined)?.forEach((profile) => {
    profileMap.set(profile.id, profile);
  });

  const slotMap = new Map<string, SlotRow>();
  slots.forEach((slot) => {
    slotMap.set(slot.uuid, slot);
  });

  const payload = bookings.map((booking) => {
    const slot = booking.appointment_slot ? slotMap.get(booking.appointment_slot) : null;
    const student = booking.user_id ? profileMap.get(booking.user_id) : null;
    return {
      id: booking.uuid,
      status: booking.status || "pending",
      booking_date: booking.booking_date || null,
      slot: slot
        ? {
            id: slot.uuid,
            title: slot.title || "Class",
            start_time: slot.start_time || null,
            end_time: slot.end_time || null,
            price: slot.price ?? 0,
            currency: slot.currency || "USD",
            studio_id: slot.studio_id || null,
            studio_name: slot.studio?.name || null,
          }
        : null,
      student: student
        ? {
            id: student.id,
            first_name: student.first_name || "",
            last_name: student.last_name || "",
            email: student.email || "",
            phone_number: student.phone_number || "",
          }
        : null,
    };
  });

  return NextResponse.json(payload);
}
