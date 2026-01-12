import { supabase } from "../lib/supabase";

export type Slot = {
  uuid: string;
  title: string;
  description?: string | null;
  studio?: string;
  studio_details?: { name?: string; city?: string; address?: string };
  trainer?: string | null;
  trainer_details?: { trainer_details?: { first_name?: string; last_name?: string } }; // maintaining awkward nesting for compatibility if needed, or simplifying
  dance_style_details?: { name?: string } | null;
  image_url?: string | null;
  start_time: string;
  end_time: string;
  price: string;
  max_participants: number;
  current_bookings?: number;
  spots_remaining?: number;
  status?: string;
};

type StorageLocation = {
  bucket: string;
  path: string;
};

const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/";
const STORAGE_SIGNED_PREFIX = "/storage/v1/object/sign/";

function extractStorageLocation(imageUrl: string): StorageLocation | null {
  const publicIndex = imageUrl.indexOf(STORAGE_PUBLIC_PREFIX);
  if (publicIndex !== -1) {
    const pathWithBucket = imageUrl.slice(publicIndex + STORAGE_PUBLIC_PREFIX.length);
    const [bucket, ...rest] = pathWithBucket.split("/");
    const path = rest.join("/");
    if (!bucket || !path) return null;
    return { bucket, path };
  }

  const signedIndex = imageUrl.indexOf(STORAGE_SIGNED_PREFIX);
  if (signedIndex !== -1) {
    const withoutPrefix = imageUrl.slice(signedIndex + STORAGE_SIGNED_PREFIX.length);
    const [pathWithBucket] = withoutPrefix.split("?");
    const [bucket, ...rest] = pathWithBucket.split("/");
    const path = rest.join("/");
    if (!bucket || !path) return null;
    return { bucket, path };
  }

  if (imageUrl.startsWith("class-images/") || imageUrl.startsWith("image/")) {
    const [bucket, ...rest] = imageUrl.split("/");
    const path = rest.join("/");
    if (!bucket || !path) return null;
    return { bucket, path };
  }

  return null;
}

async function resolveImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  const storage = extractStorageLocation(imageUrl);
  if (!storage) return imageUrl;

  const { data, error } = await supabase.storage
    .from(storage.bucket)
    .createSignedUrl(storage.path, 60 * 60);
  if (error || !data?.signedUrl) return imageUrl;

  return data.signedUrl;
}

export async function listSlots(params?: {
  studio?: string;
  trainer?: string;
  dance_style?: string;
  start_date?: string;
  end_date?: string;
  min_price?: number;
  max_price?: number;
  available_only?: boolean;
}) {
  let query = supabase
    .from('slots')
    .select(`
      *,
      studio:studios(name, city, address),
      trainer:profiles(first_name, last_name),
      dance_style:dance_styles(name)
    `);

  if (params?.studio) query = query.eq('studio_id', params.studio);
  if (params?.trainer) query = query.eq('trainer_id', params.trainer);
  if (params?.dance_style) query = query.eq('dance_style_id', params.dance_style);
  if (params?.start_date) query = query.gte('start_time', params.start_date);
  if (params?.end_date) query = query.lte('start_time', params.end_date);

  const { data, error } = await query;

  if (error) throw error;

  const resolved = await Promise.all(
    data.map(async (slot: any) => {
      const imageUrl = await resolveImageUrl(slot.image_url ?? null);
      return {
        uuid: slot.uuid,
        title: slot.title,
        description: slot.description,
        studio: slot.studio_id,
        studio_details: slot.studio,
        trainer: slot.trainer_id,
        trainer_details: { trainer_details: slot.trainer }, // Mapping to match old structure if UI expects it
        dance_style_details: slot.dance_style,
        image_url: imageUrl ?? null,
        start_time: slot.start_time,
        end_time: slot.end_time,
        price: slot.price?.toString(),
        max_participants: slot.max_participants,
        current_bookings: 0, // Need a count query or separate relation for accurate count
        spots_remaining: slot.max_participants, // Placeholder until booking count is implemented
        status: 'active',
      };
    })
  );

  return resolved as Slot[];
}
