'use client';

import { supabase } from "./supabase";
import { clearCacheByPrefix, withCache } from "./cache";

export type DanceLevel = "beginner" | "intermediate" | "advanced" | "all";

export type ClassEvent = {
  id: string;
  studioId: string;
  title: string;
  teacherId: string;
  teacherName?: string;
  locationName: string; // Studio address OR Room Name
  level: DanceLevel;
  description?: string;
  price: number;
  currency?: string;
  capacity: number;
  reservedCount?: number;
  waitlistCount?: number;
  startAt: number;
  endAt: number;
  createdAt: number;
  recurringRule?: string;
  roomId?: string;
  imageUrl?: string | null;
  isLocked?: boolean;
};

type SlotRow = {
  uuid: string;
  studio_id?: string | null;
  title?: string | null;
  trainer_id?: string | null;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  max_participants?: number | null;
  start_time: string;
  end_time: string;
  created_at?: string | null;
  recurring_rule?: string | null;
  room_id?: string | null;
  image_url?: string | null;
  is_locked?: boolean | null;
  studio?: {
    uuid?: string | null;
    name?: string | null;
    city?: string | null;
    address?: string | null;
  } | null;
  trainer?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  room?: {
    name?: string | null;
    capacity?: number | null;
  } | null;
};

function mapSlotToClass(slot: SlotRow): ClassEvent {
  const trainer = slot.trainer; // joined profile
  const studio = slot.studio;   // joined studio
  const room = slot.room;       // joined room
  
  const trainerName = trainer 
    ? `${trainer.first_name || ""} ${trainer.last_name || ""}`.trim() 
    : "Unknown Instructor";
    
  const location = room ? `${room.name} @ ${studio?.name}` : (studio?.address || studio?.city || "Studio");

  return {
    id: slot.uuid,
    studioId: studio?.uuid || slot.studio_id || "studio",
    title: slot.title || "Untitled Class",
    teacherId: slot.trainer_id || "",
    teacherName: trainerName,
    locationName: location,
    level: "all",
    description: slot.description || undefined,
    price: Number(slot.price || 0),
    currency: slot.currency || "USD",
    capacity: slot.max_participants || room?.capacity || 0,
    reservedCount: 0, // Need booking count
    waitlistCount: 0,
    startAt: new Date(slot.start_time).getTime(),
    endAt: new Date(slot.end_time).getTime(),
    createdAt: new Date(slot.created_at || Date.now()).getTime(),
    recurringRule: slot.recurring_rule || undefined,
    roomId: slot.room_id || undefined,
    imageUrl: slot.image_url || null,
    isLocked: slot.is_locked ?? false,
  };
}

function extractStoragePath(imageUrl: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/`;
  const signedPrefix = `${supabaseUrl}/storage/v1/object/sign/`;

  if (imageUrl.startsWith(publicPrefix)) {
    return imageUrl.slice(publicPrefix.length);
  }

  if (imageUrl.startsWith(signedPrefix)) {
    const withoutPrefix = imageUrl.slice(signedPrefix.length);
    const [path] = withoutPrefix.split("?");
    return path || null;
  }

  if (imageUrl.startsWith("class-images/") || imageUrl.startsWith("image/")) {
    return imageUrl;
  }

  return null;
}

export async function fetchClasses(params?: {
  trainer?: string;
  studio?: string;
  studioIds?: string[];
  dance_style?: string;
  start_date?: string;
  end_date?: string;
  min_price?: number;
  max_price?: number;
  available_only?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: "start_time";
  orderAsc?: boolean;
}) {
  const cacheKey = `classes:${JSON.stringify(params || {})}`;
  return withCache(cacheKey, 15000, async () => {
    let query = supabase
      .from('slots')
      .select(`
        *,
        studio:studios(uuid, name, city, address),
        trainer:profiles(first_name, last_name),
        room:rooms(name, capacity)
      `);

    if (params?.studio) query = query.eq('studio_id', params.studio);
    if (params?.studioIds?.length) query = query.in('studio_id', params.studioIds);
    if (params?.trainer) query = query.eq('trainer_id', params.trainer);
    if (params?.dance_style) query = query.eq('dance_style_id', params.dance_style);
    if (params?.start_date) query = query.gte('start_time', params.start_date);
    if (params?.end_date) query = query.lte('start_time', params.end_date);
    if (params?.orderBy) {
      query = query.order(params.orderBy, { ascending: params.orderAsc ?? false });
    }
    if (typeof params?.limit === "number") {
      const offset = params.offset ?? 0;
      query = query.range(offset, offset + params.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapSlotToClass);
  });
}

export async function deleteClass(slotId: string) {
  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("image_url")
    .eq("uuid", slotId)
    .single();

  if (slotError) throw slotError;

  const { error } = await supabase
    .from('slots')
    .delete()
    .eq('uuid', slotId);

  if (error) throw error;

  const imageUrl = slot?.image_url as string | null | undefined;
  if (imageUrl) {
    const { count } = await supabase
      .from("slots")
      .select("uuid", { count: "exact", head: true })
      .eq("image_url", imageUrl);

    if (!count) {
      const storagePath = extractStoragePath(imageUrl);
      if (storagePath) {
        const [bucket, ...rest] = storagePath.split("/");
        const objectPath = rest.join("/");
        if (bucket && objectPath) {
          await supabase.storage.from(bucket).remove([objectPath]);
        }
      }
    }
  }

  clearCacheByPrefix("classes:");
}

export type CreateClassInput = {
  studioId: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  capacity: number;
  startAt: Date;
  endAt: Date;
  trainerId?: string;
  danceStyleId?: string;
  roomId?: string; // New field
  recurringRule?: string;
  imageUrl?: string | null;
  isLocked?: boolean;
};

export async function createClass(input: CreateClassInput) {
  // Optional: Check availability before insert if not handled by DB trigger or UI
  // const isAvailable = await checkRoomAvailability(input.roomId, ...);
  
  const { data, error } = await supabase
    .from('slots')
    .insert({
      studio_id: input.studioId, 
      title: input.title,
      description: input.description,
      price: input.price,
      currency: input.currency || "USD",
      max_participants: input.capacity,
      start_time: input.startAt.toISOString(),
      end_time: input.endAt.toISOString(),
      trainer_id: input.trainerId || null,
      dance_style_id: input.danceStyleId || null,
      room_id: input.roomId || null,
      recurring_rule: input.recurringRule || null,
      image_url: input.imageUrl || null,
      is_locked: input.isLocked ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  clearCacheByPrefix("classes:");
  return data;
}

export async function markClassLocked(slotId: string, locked: boolean) {
  const { data, error } = await supabase
    .from('slots')
    .update({ is_locked: locked })
    .eq('uuid', slotId)
    .select()
    .single();

  if (error) throw error;
  clearCacheByPrefix("classes:");
  return data;
}
