import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const fallbackImages = [
  "https://images.unsplash.com/photo-1495791185843-c73f2269f669?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1609602961949-eddbb90383cc?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1550026593-cb89847b168d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80",
];

function pickImage(index: number) {
  return fallbackImages[index % fallbackImages.length];
}

function extractStoragePath(url: string) {
  if (!supabaseUrl) return null;
  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/`;
  const signedPrefix = `${supabaseUrl}/storage/v1/object/sign/`;
  if (url.startsWith(publicPrefix)) {
    return url.slice(publicPrefix.length);
  }
  if (url.startsWith(signedPrefix)) {
    const withoutPrefix = url.slice(signedPrefix.length);
    const [path] = withoutPrefix.split("?");
    return path || null;
  }
  return null;
}

async function resolveImageUrl(
  admin: ReturnType<typeof createClient> | null,
  rawUrl: string | null | undefined,
  index: number
) {
  if (!rawUrl) {
    return pickImage(index);
  }

  if (rawUrl.startsWith("http")) {
    const storagePath = extractStoragePath(rawUrl);
    if (admin && storagePath) {
      const [bucket, ...rest] = storagePath.split("/");
      const objectPath = rest.join("/");
      if (bucket && objectPath) {
        const { data } = await admin.storage
          .from(bucket)
          .createSignedUrl(objectPath, 60 * 60);
        if (data?.signedUrl) {
          return data.signedUrl;
        }
      }
    }
    return rawUrl;
  }

  let bucket = "class-images";
  let objectPath = rawUrl;
  const parts = rawUrl.split("/");
  if (parts[0] === "class-images" || parts[0] === "image") {
    bucket = parts[0];
    objectPath = parts.slice(1).join("/");
  }

  if (admin) {
    const { data } = await admin.storage
      .from(bucket)
      .createSignedUrl(objectPath, 60 * 60);
    if (data?.signedUrl) {
      return data.signedUrl;
    }
  }

  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  }

  return pickImage(index);
}

export async function GET(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const style = (req.nextUrl.searchParams.get("style") || "").trim();
  const studioId = (req.nextUrl.searchParams.get("studioId") || "").trim();
  const limit = Number(req.nextUrl.searchParams.get("limit") || "12");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  let styleIds: string[] = [];
  if (style) {
    const { data: styles, error: stylesError } = await supabase
      .from("dance_styles")
      .select("uuid")
      .ilike("name", `%${style}%`)
      .limit(10);

    if (stylesError) {
      return NextResponse.json({ error: stylesError.message }, { status: 500 });
    }

    styleIds = (styles || []).map((s: any) => s.uuid);
    if (styleIds.length === 0) {
      return NextResponse.json([]);
    }
  }

  let query = supabase
    .from("slots")
    .select(`
      uuid,
      title,
      description,
      start_time,
      end_time,
      price,
      currency,
      studio_id,
      max_participants,
      image_url,
      dance_style:dance_styles(name),
      studio:studios(uuid, name, city, address)
    `)
    .order("start_time", { ascending: true })
    .limit(limit);

  if (styleIds.length) {
    query = query.in("dance_style_id", styleIds);
  }
  if (studioId) {
    query = query.eq("studio_id", studioId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = await Promise.all(
    (data || []).map(async (slot: any, index: number) => {
      const start = slot.start_time ? new Date(slot.start_time) : null;
      const end = slot.end_time ? new Date(slot.end_time) : null;
      const durationMinutes =
        start && end ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)) : 60;
      const imageUrl = await resolveImageUrl(admin, slot.image_url, index);
      return {
        id: slot.uuid,
        title: slot.title || slot.dance_style?.name || "Dance class",
        description: slot.description || "Discover a class that matches your rhythm.",
        imageUrl,
        duration: `${durationMinutes} min`,
        level: "All Levels",
        capacity: slot.max_participants ?? 15,
        price: slot.price ?? 0,
        currency: slot.currency || "USD",
        styleName: slot.dance_style?.name || null,
        studioId: slot.studio?.uuid || slot.studio_id || null,
        studioName: slot.studio?.name || null,
        studioCity: slot.studio?.city || null,
        studioAddress: slot.studio?.address || null,
        startTime: slot.start_time || null,
        endTime: slot.end_time || null,
      };
    })
  );

  return NextResponse.json(mapped);
}
