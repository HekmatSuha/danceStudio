import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../../lib/server-supabase";
import { withServerCache } from "../../../../../lib/server-cache";

type StudioIdRow = { studio_id?: string | null };
type OwnedStudioRow = { uuid?: string | null };
type SlotRow = { uuid?: string | null };
type RoomRow = { id?: string | null };

async function resolveStudios(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthedSupabaseClient>>>,
) {
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

  const data = await withServerCache(
    `owner:requests:summary:${auth.userId}:${studioIdsParam || "all"}`,
    10000,
    async () => {
      const allowedStudioIds = await resolveStudios(auth);
      const requestedIds = studioIdsParam
        ? studioIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
        : allowedStudioIds;
      const studioIds = requestedIds.filter((id) => allowedStudioIds.includes(id));

      if (studioIds.length === 0) {
        return { bookingCount: 0, rentalCount: 0 };
      }

      const { data: slotRows, error: slotError } = await auth.supabase
        .from("slots")
        .select("uuid")
        .in("studio_id", studioIds);

      if (slotError) {
        throw new Error(slotError.message);
      }

      const slotIds = (slotRows as SlotRow[] | null | undefined)
        ?.map((row) => row.uuid)
        .filter(Boolean) as string[] | undefined;

      let bookingCount = 0;
      if (slotIds?.length) {
        const { count, error: bookingError } = await auth.supabase
          .from("bookings")
          .select("uuid", { count: "exact", head: true })
          .eq("status", "pending")
          .in("appointment_slot", slotIds);

        if (bookingError) {
          console.warn("Failed to load pending bookings summary", bookingError);
        } else {
          bookingCount = count ?? 0;
        }
      }

      const { data: roomRows, error: roomError } = await auth.supabase
        .from("rooms")
        .select("id")
        .in("studio_id", studioIds);

      if (roomError) {
        throw new Error(roomError.message);
      }

      const roomIds = (roomRows as RoomRow[] | null | undefined)
        ?.map((row) => row.id)
        .filter(Boolean) as string[] | undefined;

      let rentalCount = 0;
      if (roomIds?.length) {
        const { count, error: rentalError } = await auth.supabase
          .from("room_rentals")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .in("room_id", roomIds);

        if (rentalError) {
          console.warn("Failed to load pending rentals summary", rentalError);
        } else {
          rentalCount = count ?? 0;
        }
      }

      return {
        bookingCount,
        rentalCount,
      };
    },
  );

  return NextResponse.json(data);
}
