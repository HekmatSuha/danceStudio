import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withServerCache } from "../../../../../../lib/server-cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ReviewRow = {
  uuid: string;
  rating?: number | null;
  comment?: string | null;
  studio_response?: string | null;
  created_at?: string | null;
  user?: { first_name?: string | null; last_name?: string | null } | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const { id: studioId } = await params;
  if (!studioId) {
    return NextResponse.json({ error: "Studio id is required" }, { status: 400 });
  }

  try {
    const mapped = await withServerCache(`public:studios:reviews:${studioId}`, 30000, async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase
        .from("reviews")
        .select(
          "uuid, rating, comment, studio_response, created_at, user:profiles(first_name, last_name)"
        )
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw new Error(error.message);

      return (data as ReviewRow[] | null | undefined)?.map((row) => ({
        uuid: row.uuid,
        rating: row.rating ?? 0,
        comment: row.comment || "",
        studio_response: row.studio_response || null,
        created_at: row.created_at,
        author_name: row.user
          ? `${row.user.first_name || ""} ${row.user.last_name || ""}`.trim() || "Guest"
          : "Guest",
      })) ?? [];
    });

    return NextResponse.json(mapped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
