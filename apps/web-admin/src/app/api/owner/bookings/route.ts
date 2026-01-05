import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../lib/server-supabase";
import { withServerCache } from "../../../../lib/server-cache";

async function resolveStudios(auth: Awaited<ReturnType<typeof getAuthedSupabaseClient>>) {
  const { data: staffData } = await auth.supabase
    .from("tenant_staff")
    .select("studio_id")
    .eq("user_id", auth.userId);

  const { data: ownedData } = await auth.supabase
    .from("studios")
    .select("uuid")
    .eq("owner_id", auth.userId);

  const ids = new Set<string>();
  (staffData || []).forEach((row: any) => ids.add(row.studio_id));
  (ownedData || []).forEach((row: any) => ids.add(row.uuid));
  return Array.from(ids);
}

export async function GET(req: NextRequest) {
  const auth = await getAuthedSupabaseClient(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studioIdsParam = req.nextUrl.searchParams.get("studioIds");
  const select = req.nextUrl.searchParams.get("select") || "*";

  const allowedStudioIds = await resolveStudios(auth);
  const requestedIds = studioIdsParam
    ? studioIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : allowedStudioIds;

  const studioIds = requestedIds.filter((id) => allowedStudioIds.includes(id));
  const cacheKey = `owner:bookings:${auth.userId}:${studioIds.join(",")}:${select}`;

  const data = await withServerCache(cacheKey, 10000, async () => {
    if (studioIds.length === 0) return [];

    const { data: slotRows, error: slotError } = await auth.supabase
      .from("slots")
      .select("uuid")
      .in("studio_id", studioIds);

    if (slotError) throw slotError;

    const slotIds = (slotRows || []).map((row: any) => row.uuid);
    if (slotIds.length === 0) return [];

    const { data: bookings, error } = await auth.supabase
      .from("bookings")
      .select(select)
      .in("appointment_slot", slotIds);

    if (error) throw error;
    return bookings || [];
  });

  return NextResponse.json(data);
}
