import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../../lib/server-supabase";
import { withServerCache } from "../../../../../lib/server-cache";

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

  const payload = await withServerCache(
    `owner:requests:bookings:${auth.userId}:${studioIdsParam || "all"}`,
    10000,
    async () => {
      const allowedStudioIds = await resolveStudios(auth);
      const requestedIds = studioIdsParam
        ? studioIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
        : allowedStudioIds;
      const studioIds = requestedIds.filter((id) => allowedStudioIds.includes(id));

      if (studioIds.length === 0) {
        return [];
      }

      const { data: bookingRows, error: bookingError } = await auth.supabase
        .from("bookings")
        .select(
          `
          uuid,
          status,
          booking_date,
          appointment_slot,
          user_id,
          slot:slots!inner (
            uuid,
            title,
            start_time,
            end_time,
            price,
            currency,
            studio_id,
            studio:studios (
              name
            )
          ),
          student:profiles (
            id,
            first_name,
            last_name,
            email,
            phone_number
          )
        `,
        )
        .eq("status", "pending")
        .in("slots.studio_id", studioIds);

      if (bookingError) {
        throw new Error(bookingError.message);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (bookingRows as any[]).map((booking) => {
        const slot = booking.slot;
        const student = booking.student;
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
    },
  );

  return NextResponse.json(payload);
}
