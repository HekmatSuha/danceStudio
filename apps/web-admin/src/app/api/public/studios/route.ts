import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const limit = Number(req.nextUrl.searchParams.get("limit") || "8");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("studios")
    .select("uuid,name,city,address")
    .order("name")
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data || []).map((studio, index) => ({
    id: studio.uuid,
    name: studio.name || "Studio",
    city: studio.city || null,
    address: studio.address || null,
    imageUrl: fallbackImages[index % fallbackImages.length],
  }));

  return NextResponse.json(mapped);
}
