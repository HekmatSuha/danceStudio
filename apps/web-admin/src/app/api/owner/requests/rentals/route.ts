import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../../lib/server-supabase";
import { withServerCache } from "../../../../../lib/server-cache";

type StudioIdRow = { studio_id?: string | null };
type OwnedStudioRow = { uuid?: string | null };
type RoomRow = {
  id: string;
  name?: string | null;
  studio_id?: string | null;
  studio?: { name?: string | null } | null;
};
type RentalRow = {
  id: string;
  room_id?: string | null;
  renter_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  total_price?: number | null;
  status?: string | null;
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

      const { data: roomRows, error: roomError } = await auth.supabase
        .from("rooms")
        .select("id, name, studio_id, studio:studios(name)")
        .in("studio_id", studioIds);

      if (roomError) {
        throw new Error(roomError.message);
      }

      const rooms = (roomRows as RoomRow[] | null | undefined) ?? [];
      const roomIds = rooms.map((room) => room.id);
      if (roomIds.length === 0) {
        return [];
      }

      const { data: rentalRows, error: rentalError } = await auth.supabase
        .from("room_rentals")
        .select("id, room_id, renter_id, start_time, end_time, total_price, status")
        .eq("status", "pending")
        .in("room_id", roomIds);

      if (rentalError) {
        throw new Error(rentalError.message);
      }

      const rentals = (rentalRows as RentalRow[] | null | undefined) ?? [];
      const renterIds = rentals.map((r) => r.renter_id).filter(Boolean) as string[];
      const { data: profileRows, error: profileError } = renterIds.length
        ? await auth.supabase
            .from("profiles")
            .select("id, first_name, last_name, email, phone_number")
            .in("id", renterIds)
        : { data: [], error: null };

      if (profileError) {
        throw new Error(profileError.message);
      }

      const profileMap = new Map<string, ProfileRow>();
      (profileRows as ProfileRow[] | null | undefined)?.forEach((profile) => {
        profileMap.set(profile.id, profile);
      });

      const roomMap = new Map<string, RoomRow>();
      rooms.forEach((room) => {
        roomMap.set(room.id, room);
      });

      return rentals.map((rental) => {
        const room = rental.room_id ? roomMap.get(rental.room_id) : null;
        const renter = rental.renter_id ? profileMap.get(rental.renter_id) : null;
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
