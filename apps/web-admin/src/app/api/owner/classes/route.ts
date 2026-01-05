import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../lib/server-supabase";
import { withServerCache } from "../../../../lib/server-cache";

function mapSlotToClass(slot: any) {
  const trainer = slot.trainer;
  const studio = slot.studio;
  const room = slot.room;

  const trainerName = trainer
    ? `${trainer.first_name || ""} ${trainer.last_name || ""}`.trim()
    : "Unknown Instructor";

  const location = room
    ? `${room.name} @ ${studio?.name}`
    : (studio?.address || studio?.city || "Studio");

  return {
    id: slot.uuid,
    studioId: studio?.uuid || slot.studio_id || "studio",
    title: slot.title || "Untitled Class",
    teacherId: slot.trainer_id || "",
    teacherName: trainerName,
    locationName: location,
    level: "all",
    description: slot.description,
    price: Number(slot.price || 0),
    currency: slot.currency || "USD",
    capacity: slot.max_participants || room?.capacity || 0,
    reservedCount: 0,
    waitlistCount: 0,
    startAt: new Date(slot.start_time).getTime(),
    endAt: new Date(slot.end_time).getTime(),
    createdAt: new Date(slot.created_at || Date.now()).getTime(),
    recurringRule: slot.recurring_rule,
    roomId: slot.room_id,
    imageUrl: slot.image_url || null,
    isLocked: slot.is_locked ?? false,
  };
}

type AuthedClient = NonNullable<Awaited<ReturnType<typeof getAuthedSupabaseClient>>>;

async function resolveStudios(auth: AuthedClient) {
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
  const limit = Number(req.nextUrl.searchParams.get("limit") || "0");
  const offset = Number(req.nextUrl.searchParams.get("offset") || "0");

  const allowedStudioIds = await resolveStudios(auth);
  const requestedIds = studioIdsParam
    ? studioIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : allowedStudioIds;

  const studioIds = requestedIds.filter((id) => allowedStudioIds.includes(id));
  const cacheKey = `owner:classes:${auth.userId}:${studioIds.join(",")}:${limit}:${offset}`;

  const data = await withServerCache(cacheKey, 10000, async () => {
    if (studioIds.length === 0) return [];

    let query = auth.supabase
      .from("slots")
      .select(`
        *,
        studio:studios(uuid, name, city, address),
        trainer:profiles(first_name, last_name),
        room:rooms(name, capacity)
      `)
      .in("studio_id", studioIds)
      .order("start_time", { ascending: false });

    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: slots, error } = await query;
    if (error) throw error;
    return (slots || []).map(mapSlotToClass);
  });

  return NextResponse.json(data);
}
