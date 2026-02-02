import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withServerCache } from "../../../../lib/server-cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const fallbackImages = [
  "https://images.unsplash.com/photo-1495791185843-c73f2269f669?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1609602961949-eddbb90383cc?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1550026593-cb89847b168d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80",
];

export async function GET(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const isAll = limitParam === "all";
  const limit = isAll ? null : Number(limitParam || "8");
  const cacheKey = `public:studios:${isAll ? "all" : limit}`;

  try {
    const mapped = await withServerCache(cacheKey, 30000, async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      let query = supabase
        .from("studios")
        .select("uuid,name,city,address,image_url")
        .order("name");

      if (limit && Number.isFinite(limit) && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      return (data || []).map((studio, index) => ({
        id: studio.uuid,
        name: studio.name || "Studio",
        city: studio.city || null,
        address: studio.address || null,
        imageUrl: studio.image_url || fallbackImages[index % fallbackImages.length],
      }));
    });

    return NextResponse.json(mapped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load studios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
