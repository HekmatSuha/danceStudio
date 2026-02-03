import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  const userId = userResult?.user?.id;
  if (userError || !userId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (profile?.role === "super_admin") {
    return NextResponse.json(
      { error: "Super admin accounts cannot be deleted." },
      { status: 403 }
    );
  }

  const { data: ownedStudios, error: ownedError } = await supabaseAdmin
    .from("studios")
    .select("uuid")
    .eq("owner_id", userId)
    .limit(1);

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 500 });
  }

  if (ownedStudios && ownedStudios.length > 0) {
    return NextResponse.json(
      { error: "Account owns studios. Transfer or delete them first." },
      { status: 409 }
    );
  }

  await supabaseAdmin.from("tenant_staff").delete().eq("user_id", userId);
  await supabaseAdmin.from("student_studios").delete().eq("student_id", userId);
  await supabaseAdmin.from("room_rentals").delete().eq("renter_id", userId);
  await supabaseAdmin.from("reviews").delete().eq("user_id", userId);
  await supabaseAdmin.from("bookings").delete().eq("user_id", userId);
  await supabaseAdmin.from("slots").update({ trainer_id: null }).eq("trainer_id", userId);

  const { error: profileDeleteError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profileDeleteError) {
    return NextResponse.json({ error: profileDeleteError.message }, { status: 500 });
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    return NextResponse.json(
      { error: `Deleted profile but failed to delete auth user: ${authError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
