import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withServerCache } from "../../../../lib/server-cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  try {
    const data = await withServerCache("public:dance-styles", 60000, async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase
        .from("dance_styles")
        .select("uuid,name")
        .order("name");

      if (error) throw new Error(error.message);
      return data || [];
    });

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load dance styles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
