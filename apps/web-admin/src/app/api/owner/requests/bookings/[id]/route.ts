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

  const { id: bookingId } = await params;
  if (!bookingId) {
    return NextResponse.json({ error: "Booking id is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const status = typeof body?.status === "string" ? body.status : "";
  if (!["confirmed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: bookingRow, error: bookingError } = await auth.supabase
    .from("bookings")
    .select("appointment_slot")
    .eq("uuid", bookingId)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  const slotId = bookingRow?.appointment_slot;
  if (!slotId) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: slotRow, error: slotError } = await auth.supabase
    .from("slots")
    .select("studio_id")
    .eq("uuid", slotId)
    .maybeSingle();

  if (slotError) {
    return NextResponse.json({ error: slotError.message }, { status: 500 });
  }

  const allowedStudios = await resolveStudios(auth);
  if (!slotRow?.studio_id || !allowedStudios.includes(slotRow.studio_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from("bookings")
    .update({ status })
    .eq("uuid", bookingId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || { uuid: bookingId, status });
}
