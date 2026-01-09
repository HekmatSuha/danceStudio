import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type StudioRow = {
  uuid: string;
  name: string;
  city?: string | null;
  address?: string | null;
};

type StyleRow = {
  uuid: string;
};

type SlotRow = {
  studio?: StudioRow | null;
  dance_style?: { name?: string | null } | null;
};

export async function GET(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const query = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!query) {
    return NextResponse.json([]);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: styles, error: stylesError } = await supabase
    .from("dance_styles")
    .select("uuid,name")
    .ilike("name", `%${query}%`)
    .limit(5);

  if (stylesError) {
    return NextResponse.json({ error: stylesError.message }, { status: 500 });
  }

  const styleIds = (styles as StyleRow[] | null | undefined)?.map((style) => style.uuid) ?? [];
  if (styleIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: slots, error: slotsError } = await supabase
    .from("slots")
    .select(`
      studio:studios(uuid, name, city, address),
      dance_style:dance_styles(uuid, name)
    `)
    .in("dance_style_id", styleIds)
    .limit(200);

  if (slotsError) {
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
  }

  const studiosMap = new Map<string, { studio: StudioRow; styles: string[] }>();
  (slots as SlotRow[] | null | undefined)?.forEach((slot) => {
    const studio = slot.studio ?? null;
    const styleName = slot.dance_style?.name ?? undefined;
    if (!studio?.uuid) return;

    const existing = studiosMap.get(studio.uuid);
    if (existing) {
      if (styleName && !existing.styles.includes(styleName)) {
        existing.styles.push(styleName);
      }
    } else {
      studiosMap.set(studio.uuid, {
        studio,
        styles: styleName ? [styleName] : [],
      });
    }
  });

  return NextResponse.json(Array.from(studiosMap.values()));
}
