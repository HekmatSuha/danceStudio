import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../../lib/server-supabase";

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
  const allowedStudioIds = await resolveStudios(auth);
  const requestedIds = studioIdsParam
    ? studioIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : allowedStudioIds;
  const studioIds = requestedIds.filter((id) => allowedStudioIds.includes(id));

  if (studioIds.length === 0) {
    return NextResponse.json({ bookingCount: 0, rentalCount: 0 });
  }

  const { data: slotRows, error: slotError } = await auth.supabase
    .from("slots")
    .select("uuid")
    .in("studio_id", studioIds);

  if (slotError) {
    return NextResponse.json({ error: slotError.message }, { status: 500 });
  }

  const slotIds = (slotRows as SlotRow[] | null | undefined)
    ?.map((row) => row.uuid)
    .filter(Boolean) as string[] | undefined;

  const { count: bookingCount, error: bookingError } = slotIds?.length
    ? await auth.supabase
        .from("bookings")
        .select("uuid", { count: "exact", head: true })
        .eq("status", "pending")
        .in("appointment_slot", slotIds)
    : { count: 0, error: null };

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  const { data: roomRows, error: roomError } = await auth.supabase
    .from("rooms")
    .select("id")
    .in("studio_id", studioIds);

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  const roomIds = (roomRows as RoomRow[] | null | undefined)
    ?.map((row) => row.id)
    .filter(Boolean) as string[] | undefined;

  const { count: rentalCount, error: rentalError } = roomIds?.length
    ? await auth.supabase
        .from("room_rentals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .in("room_id", roomIds)
    : { count: 0, error: null };

  if (rentalError) {
    return NextResponse.json({ error: rentalError.message }, { status: 500 });
  }

  return NextResponse.json({
    bookingCount: bookingCount ?? 0,
    rentalCount: rentalCount ?? 0,
  });
}
