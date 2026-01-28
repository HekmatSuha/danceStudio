import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withServerCache } from "../../../../../lib/server-cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    const data = await withServerCache(`public:studios:detail:${studioId}`, 30000, async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .eq("uuid", studioId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    });

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Studio not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
