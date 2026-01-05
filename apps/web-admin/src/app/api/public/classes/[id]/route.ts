import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  rawUrl: string | null | undefined
) {
  if (!rawUrl) return null;

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

  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const slotId = params.id;
  if (!slotId) {
    return NextResponse.json({ error: "Class id is required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  const { data, error } = await supabase
    .from("slots")
    .select(
      `
      uuid,
      title,
      description,
      start_time,
      end_time,
      price,
      currency,
      max_participants,
      image_url,
      studio:studios(uuid, name, city, address, latitude, longitude, phone, website)
    `
    )
    .eq("uuid", slotId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const imageUrl = await resolveImageUrl(admin, data.image_url);
  const payload = {
    id: data.uuid,
    title: data.title || "Dance class",
    description: data.description || "",
    startTime: data.start_time,
    endTime: data.end_time,
    price: data.price ?? 0,
    currency: data.currency || "USD",
    capacity: data.max_participants ?? 15,
    imageUrl,
    studio: data.studio || null,
  };

  return NextResponse.json(payload);
}
