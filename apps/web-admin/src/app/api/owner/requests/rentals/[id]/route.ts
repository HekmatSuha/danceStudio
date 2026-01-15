import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../../../lib/server-supabase";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthedSupabaseClient(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rentalId } = await params;
  if (!rentalId) {
    return NextResponse.json({ error: "Rental id is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const status = typeof body?.status === "string" ? body.status : "";
  if (!["confirmed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: rentalRow, error: rentalError } = await auth.supabase
    .from("room_rentals")
    .select("room_id")
    .eq("id", rentalId)
    .maybeSingle();

  if (rentalError) {
    return NextResponse.json({ error: rentalError.message }, { status: 500 });
  }

  const roomId = rentalRow?.room_id;
  if (!roomId) {
    return NextResponse.json({ error: "Rental not found" }, { status: 404 });
  }

  const { data: roomRow, error: roomError } = await auth.supabase
    .from("rooms")
    .select("studio_id")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  const allowedStudios = await resolveStudios(auth);
  if (!roomRow?.studio_id || !allowedStudios.includes(roomRow.studio_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from("room_rentals")
    .update({ status })
    .eq("id", rentalId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || { id: rentalId, status });
}
