import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../lib/server-supabase";
import { withServerCache } from "../../../../lib/server-cache";

export async function GET(req: NextRequest) {
  const auth = await getAuthedSupabaseClient(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `owner:studios:${auth.userId}`;
  const studios = await withServerCache(cacheKey, 15000, async () => {
    const { data: staffData, error: staffError } = await auth.supabase
      .from("tenant_staff")
      .select("studio:studios(*)")
      .eq("user_id", auth.userId);

    if (staffError) {
      console.warn("Failed to load tenant_staff studios:", staffError.message);
    }

    const { data: ownedData, error: ownedError } = await auth.supabase
      .from("studios")
      .select("*")
      .eq("owner_id", auth.userId);

    if (ownedError) throw ownedError;

    const studiosMap = new Map<string, any>();
    (staffData || []).forEach((item: any) => {
      if (item.studio?.uuid) studiosMap.set(item.studio.uuid, item.studio);
    });
    (ownedData || []).forEach((studio: any) => {
      if (studio?.uuid) studiosMap.set(studio.uuid, studio);
    });

    return Array.from(studiosMap.values());
  });

  return NextResponse.json(studios);
}
