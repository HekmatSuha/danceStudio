'use client';

import { supabase } from "./supabase";
import { clearCacheByPrefix, withCache } from "./cache";

export type Studio = {
  uuid: string;
  name: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
  image_url?: string | null;
};

export type Room = {
  id: string;
  studio_id: string;
  name: string;
  capacity: number;
  price_per_hour?: number;
  currency?: string | null;
};

export type StudioStaff = {
  id: string; // relationship id
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
  photo?: string;
};

type StaffStudioRow = {
  studio?: Studio | null;
};

type StudioStaffRow = {
  id: string;
  role: string;
  user: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
};

export async function listStudios() {
  return withCache("studios:all", 30000, async () => {
    const { data, error } = await supabase
      .from('studios')
      .select('uuid, name, city, address, latitude, longitude, whatsapp, image_url');

    if (error) throw error;
    return data as Studio[];
  });
}

export async function fetchMyStudios() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  if (!user) throw new Error("Not authenticated");

  return withCache(`studios:mine:${user.id}`, 20000, async () => {
    const [staffResult, ownedResult] = await Promise.all([
      supabase
        .from('tenant_staff')
        .select(`
          studio:studios(uuid, name, city, address, latitude, longitude, whatsapp, image_url)
        `)
        .eq('user_id', user.id),
      supabase
        .from('studios')
        .select('uuid, name, city, address, latitude, longitude, whatsapp, image_url')
        .eq('owner_id', user.id)
    ]);

    const { data: staffData, error: staffError } = staffResult;
    const { data: ownedData, error: ownedError } = ownedResult;

    if (ownedError) throw ownedError;

    const studios = new Map<string, Studio>();

    (staffData as StaffStudioRow[] | null | undefined)?.forEach((item) => {
      if (item.studio?.uuid) studios.set(item.studio.uuid, item.studio);
    });

    (ownedData as Studio[] | null | undefined)?.forEach((studio) => {
      if (studio?.uuid) studios.set(studio.uuid, studio);
    });

    return Array.from(studios.values());
  });
}

export async function createStudio(data: {
  name: string;
  city: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: studio, error } = await supabase
    .from('studios')
    .insert({
      name: data.name,
      city: data.city,
      address: data.address,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      whatsapp: data.whatsapp ?? null,
      owner_id: user.id
    })
    .select()
    .single();

  if (error) throw error;
  clearCacheByPrefix("studios:");
  return studio;
}

export async function updateStudio(uuid: string, data: Partial<Studio>) {
  const { data: studios, error } = await supabase
    .from('studios')
    .update({
      name: data.name,
      city: data.city,
      address: data.address,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      whatsapp: data.whatsapp ?? null
    })
    .eq('uuid', uuid)
    .select();

  if (error) throw error;
  clearCacheByPrefix("studios:");
  if (!studios || studios.length === 0) {
    throw new Error("No studio was updated. Check your permissions.");
  }
  return studios[0] as Studio;
}

export async function deleteStudio(uuid: string) {
  const { error } = await supabase
    .from('studios')
    .delete()
    .eq('uuid', uuid);

  if (error) throw error;
  clearCacheByPrefix("studios:");
}

export async function fetchRooms(studioId: string) {
  return withCache(`rooms:${studioId}`, 20000, async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, studio_id, name, capacity, price_per_hour, currency')
      .eq('studio_id', studioId);

    if (error) throw error;
    return data as Room[];
  });
}

export async function createRoom(data: { studioId: string; name: string; capacity: number; pricePerHour?: number; currency?: string }) {
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      studio_id: data.studioId,
      name: data.name,
      capacity: data.capacity,
      price_per_hour: data.pricePerHour,
      currency: data.currency || "USD",
    })
    .select()
    .single();

  if (error) throw error;
  clearCacheByPrefix("rooms:");
  return room as Room;
}

export async function updateRoom(roomId: string, data: { name?: string; capacity?: number; pricePerHour?: number | null; currency?: string | null }) {
  const { data: room, error } = await supabase
    .from('rooms')
    .update({
      name: data.name,
      capacity: data.capacity,
      price_per_hour: data.pricePerHour ?? null,
      currency: data.currency ?? null,
    })
    .eq('id', roomId)
    .select()
    .single();

  if (error) throw error;
  clearCacheByPrefix("rooms:");
  return room as Room;
}

export async function deleteRoom(roomId: string) {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (error) throw error;
  clearCacheByPrefix("rooms:");
}

export async function fetchStudioStaff(studioId: string) {
  const { data, error } = await supabase
    .from('tenant_staff')
    .select(`
      id,
      role,
      user:profiles(id, first_name, last_name, avatar_url)
    `)
    .eq('studio_id', studioId);

  if (error) throw error;
  
  return (data as unknown as StudioStaffRow[]).map((item) => ({
    id: item.id,
    user_id: item.user.id,
    first_name: item.user.first_name || "",
    last_name: item.user.last_name || "",
    photo: item.user.avatar_url || undefined,
    role: item.role,
  }));
}

export async function addStudioStaff(studioId: string, userId: string, role: string = 'instructor') {
  const { data, error } = await supabase
    .from('tenant_staff')
    .insert({
      studio_id: studioId,
      user_id: userId,
      role
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
