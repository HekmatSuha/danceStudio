import { NextRequest, NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getAuthedSupabaseClient } from "../../../../lib/server-supabase";
import { withServerCache } from "../../../../lib/server-cache";

async function hasStudioAccess(
  supabase: SupabaseClient,
  userId: string,
  studioId: string,
) {
  const { data: owned, error: ownedError } = await supabase
    .from("studios")
    .select("uuid")
    .eq("uuid", studioId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedError) throw ownedError;
  if (owned?.uuid) return true;

  const { data: staff, error: staffError } = await supabase
    .from("tenant_staff")
    .select("studio_id")
    .eq("studio_id", studioId)
    .eq("user_id", userId)
    .maybeSingle();

  if (staffError) throw staffError;
  return Boolean(staff?.studio_id);
}

export async function GET(req: NextRequest) {
  const auth = await getAuthedSupabaseClient(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studioId = req.nextUrl.searchParams.get("studioId");
  if (!studioId) {
    return NextResponse.json({ error: "studioId is required" }, { status: 400 });
  }

  const hasAccess = await hasStudioAccess(auth.supabase, auth.userId, studioId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cacheKey = `owner:rooms:${auth.userId}:${studioId}`;
  const rooms = await withServerCache(cacheKey, 10000, async () => {
    const { data, error } = await auth.supabase
      .from("rooms")
      .select("*")
      .eq("studio_id", studioId);

    if (error) throw error;
    return data || [];
  });

  return NextResponse.json(rooms);
}
