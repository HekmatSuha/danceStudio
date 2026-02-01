import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getAuthedSupabaseClient } from "../../../../../lib/server-supabase";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slotId: string }> },
) {
  const auth = await getAuthedSupabaseClient(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slotId } = await context.params;
  if (!slotId) {
    return NextResponse.json({ error: "Missing slot id" }, { status: 400 });
  }

  const { data: slot, error: slotError } = await auth.supabase
    .from("slots")
    .select("uuid, trainer_id")
    .eq("uuid", slotId)
    .single();

  if (slotError) {
    return NextResponse.json({ error: slotError.message }, { status: 500 });
  }

  if (!slot || slot.trainer_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      `
      uuid,
      user_id,
      status,
      attended,
      booking_date,
      user:profiles(id, first_name, last_name, username, email, phone_number)
    `,
    )
    .eq("appointment_slot", slotId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
