import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { withServerCache } from "../../../../../lib/server-cache";

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
  admin: SupabaseClient | null,
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
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const { id: rawId } = await params;
  const slotId = decodeURIComponent(rawId || "");
  if (!slotId) {
    return NextResponse.json({ error: "Class id is required" }, { status: 400 });
  }

  try {
    const payload = await withServerCache(`public:classes:detail:${slotId}`, 20000, async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const admin = supabaseServiceRoleKey
        ? createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : null;

      const baseSelect = `
        uuid,
        title,
        description,
        start_time,
        end_time,
        price,
        currency,
        max_participants,
        image_url,
        studio:studios(uuid, name, city, address)
      `;

      const { data, error } = await supabase
        .from("slots")
        .select(baseSelect)
        .eq("uuid", slotId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(error.message);
      }

      let slotData = data;
      if (!slotData) {
        const fallback = await supabase
          .from("slots")
          .select(baseSelect)
          .eq("id", slotId)
          .single();
        if (fallback.error && fallback.error.code !== "PGRST116") {
          throw new Error(fallback.error.message);
        }
        slotData = fallback.data;
      }

      if (!slotData) {
        throw new Error("Class not found");
      }

      const imageUrl = await resolveImageUrl(admin, slotData.image_url);
      return {
        id: slotData.uuid,
        title: slotData.title || "Dance class",
        description: slotData.description || "",
        startTime: slotData.start_time,
        endTime: slotData.end_time,
        price: slotData.price ?? 0,
        currency: slotData.currency || "USD",
        capacity: slotData.max_participants ?? 15,
        imageUrl,
        studio: slotData.studio || null,
      };
    });

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load class";
    const status = message === "Class not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
