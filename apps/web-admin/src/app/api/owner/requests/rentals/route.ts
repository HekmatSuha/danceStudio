import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../../lib/server-supabase";
import { withServerCache } from "../../../../../lib/server-cache";

type StudioIdRow = { studio_id?: string | null };
type OwnedStudioRow = { uuid?: string | null };

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
    `owner:requests:rentals:${auth.userId}:${studioIdsParam || "all"}`,
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

      const { data: rentalRows, error: rentalError } = await auth.supabase
        .from("room_rentals")
        .select(
          `
          id,
          status,
          start_time,
          end_time,
          total_price,
          room_id,
          renter_id,
          room:rooms!inner (
            id,
            name,
            studio_id,
            studio:studios (
              name
            )
          ),
          renter:profiles (
            id,
            first_name,
            last_name,
            email,
            phone_number
          )
        `,
        )
        .eq("status", "pending")
        .in("rooms.studio_id", studioIds);

      if (rentalError) {
        throw new Error(rentalError.message);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (rentalRows as any[]).map((rental) => {
        const room = rental.room;
        const renter = rental.renter;
        return {
          id: rental.id,
          status: rental.status || "pending",
          start_time: rental.start_time || null,
          end_time: rental.end_time || null,
          total_price: rental.total_price ?? 0,
          room: room
            ? {
                id: room.id,
                name: room.name || "Room",
                studio_id: room.studio_id || null,
                studio_name: room.studio?.name || null,
              }
            : null,
          renter: renter
            ? {
                id: renter.id,
                first_name: renter.first_name || "",
                last_name: renter.last_name || "",
                email: renter.email || "",
                phone_number: renter.phone_number || "",
              }
            : null,
        };
      });
    },
  );

  return NextResponse.json(payload);
}
