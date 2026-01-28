import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { withServerCache } from "../../../../lib/server-cache";

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
  admin: SupabaseClient | null,
  rawUrl: string | null | undefined,
  index: number
) {
  if (!rawUrl) {
    return pickImage(index);
  }

  // If it's already a full URL, return it
  if (rawUrl.startsWith("http")) {
    return rawUrl;
  }

  // Construct public URL for Supabase Storage
  // Assuming 'class-images' and 'image' buckets are public
  let bucket = "class-images";
  let objectPath = rawUrl;
  
  const parts = rawUrl.split("/");
  if (parts[0] === "class-images" || parts[0] === "image") {
    bucket = parts[0];
    objectPath = parts.slice(1).join("/");
  }

  // Remove leading slash from objectPath to prevent double slashes
  if (objectPath.startsWith("/")) {
    objectPath = objectPath.slice(1);
  }

  if (supabaseUrl) {
    const baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
    return `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  }

  return pickImage(index);
}

export async function GET(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const style = (req.nextUrl.searchParams.get("style") || "").trim();
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const studioId = (req.nextUrl.searchParams.get("studioId") || "").trim();
  const limit = Number(req.nextUrl.searchParams.get("limit") || "12");
  const cacheKey = `public:classes:${req.nextUrl.searchParams.toString()}`;

  try {
    const mapped = await withServerCache(cacheKey, 20000, async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const admin = supabaseServiceRoleKey
        ? createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : null;

      const queryText = q || style;
      const queryToken = queryText.replace(/,/g, " ").trim();
      let styleIds: string[] = [];
      let studioIds: string[] = [];
      let trainerIds: string[] = [];

      if (queryText) {
        const { data: styles, error: stylesError } = await supabase
          .from("dance_styles")
          .select("uuid")
          .ilike("name", `%${queryText}%`)
          .limit(10);

        if (stylesError) {
          throw new Error(stylesError.message);
        }

        styleIds =
          (styles as Array<{ uuid: string }> | null | undefined)?.map((s) => s.uuid) ?? [];

        const { data: studios, error: studiosError } = await supabase
          .from("studios")
          .select("uuid")
          .ilike("name", `%${queryText}%`)
          .limit(20);

        if (studiosError) {
          throw new Error(studiosError.message);
        }

        studioIds =
          (studios as Array<{ uuid: string }> | null | undefined)?.map((s) => s.uuid) ?? [];

        const { data: trainers, error: trainersError } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "instructor")
          .or(`first_name.ilike.%${queryText}%,last_name.ilike.%${queryText}%`)
          .limit(20);

        if (trainersError) {
          throw new Error(trainersError.message);
        }

        trainerIds =
          (trainers as Array<{ id: string }> | null | undefined)?.map((t) => t.id) ?? [];

        const hasNameQuery = queryToken.length > 0;
        if (
          !hasNameQuery &&
          styleIds.length === 0 &&
          studioIds.length === 0 &&
          trainerIds.length === 0
        ) {
          return [];
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
          level,
          studio_id,
          max_participants,
          image_url,
          dance_style:dance_styles(name),
          studio:studios(uuid, name, city, address),
          trainer:profiles(first_name, last_name)
        `)
        .order("start_time", { ascending: true })
        .limit(limit);

      if (queryText) {
        const filters = [
          styleIds.length ? `dance_style_id.in.(${styleIds.join(",")})` : null,
          studioIds.length ? `studio_id.in.(${studioIds.join(",")})` : null,
          trainerIds.length ? `trainer_id.in.(${trainerIds.join(",")})` : null,
          queryToken ? `title.ilike.%${queryToken}%` : null,
          queryToken ? `description.ilike.%${queryToken}%` : null,
        ].filter(Boolean);
        if (filters.length) {
          query = query.or(filters.join(","));
        }
      } else if (styleIds.length) {
        query = query.in("dance_style_id", styleIds);
      }
      if (studioId) {
        query = query.eq("studio_id", studioId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      const mapped = await Promise.all(
        ((data as Array<{
          uuid: string;
          title?: string | null;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          price?: number | null;
          currency?: string | null;
          level?: "beginner" | "intermediate" | "advanced" | "all" | null;
          studio_id?: string | null;
          max_participants?: number | null;
          image_url?: string | null;
          dance_style?: { name?: string | null } | null;
          studio?: {
            uuid?: string | null;
            name?: string | null;
            city?: string | null;
            address?: string | null;
          } | null;
          trainer?: { first_name?: string | null; last_name?: string | null } | null;
        }> | null | undefined) ?? []).map(async (slot, index: number) => {
          const start = slot.start_time ? new Date(slot.start_time) : null;
          const end = slot.end_time ? new Date(slot.end_time) : null;
          const durationMinutes =
            start && end
              ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000))
              : 60;
          const imageUrl = await resolveImageUrl(admin, slot.image_url, index);
          return {
            id: slot.uuid,
            title: slot.title || slot.dance_style?.name || "Dance class",
            description: slot.description || "Discover a class that matches your rhythm.",
            imageUrl,
            duration: `${durationMinutes} min`,
            capacity: slot.max_participants ?? 15,
            price: slot.price ?? 0,
            currency: slot.currency || "USD",
            level: slot.level || "all",
            styleName: slot.dance_style?.name || null,
            studioId: slot.studio?.uuid || slot.studio_id || null,
            studioName: slot.studio?.name || null,
            studioCity: slot.studio?.city || null,
            studioAddress: slot.studio?.address || null,
            trainerName:
              [slot.trainer?.first_name, slot.trainer?.last_name].filter(Boolean).join(" ") ||
              null,
            startTime: slot.start_time || null,
            endTime: slot.end_time || null,
          };
        })
      );

      return mapped;
    });

    return NextResponse.json(mapped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load classes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
