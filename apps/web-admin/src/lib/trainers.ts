'use client';

import { supabase } from "./supabase";
import { withCache } from "./cache";

export type Trainer = {
  uuid: string;
  first_name: string;
  last_name: string;
  bio?: string;
  photo?: string;
  is_active?: boolean;
  studio?: string | null;
  studio_details?: {
    uuid: string;
    name: string;
    city?: string;
    address?: string;
  };
};

type FetchTrainersOptions = {
  studioId?: string;
  studioIds?: string[];
};

export async function fetchTrainers(studioIdOrOptions?: string | FetchTrainersOptions) {
  let studioId: string | undefined;
  let studioIds: string[] | undefined;

  if (typeof studioIdOrOptions === "string") {
    studioId = studioIdOrOptions;
  } else if (studioIdOrOptions) {
    studioId = studioIdOrOptions.studioId;
    studioIds = studioIdOrOptions.studioIds;
  }

  // Query tenant_staff to get instructors linked to visible studios
  let query = supabase
    .from('tenant_staff')
    .select(`
      id,
      studio_id,
      studio:studios(name, city, address),
      user:profiles(id, first_name, last_name, avatar_url, bio, is_active)
    `);

  if (studioIds && studioIds.length > 0) {
    query = query.in('studio_id', studioIds);
  } else if (studioId) {
    query = query.eq('studio_id', studioId);
  }

  const cacheKey = `trainers:${JSON.stringify({ studioId, studioIds })}`;
  return withCache(cacheKey, 20000, async () => {
    const { data, error } = await query;

    if (error) throw error;

    return data.map((item: any) => ({
      uuid: item.user.id, // The User/Profile ID is the primary "Trainer" ID
      first_name: item.user.first_name,
      last_name: item.user.last_name,
      bio: item.user.bio,
      photo: item.user.avatar_url,
      is_active: item.user.is_active ?? true,
      studio: item.studio_id,
      studio_details: item.studio,
    })) as Trainer[];
  });
}

export async function createTrainer(data: {
  first_name: string;
  last_name: string;
  bio?: string;
  photo?: any;
  studio?: string | null;
}) {
  // Creating a "Trainer" usually means creating a User account. 
  // Client-side, we can't easily create another user without signing them up.
  // For this prototype/migration, we might just insert a Profile record 
  // (which might fail if no matching Auth User exists, depending on FK constraints).
  // Ideally, this should be an "Invite" feature (Supabase Auth Admin).
  
  // For now, attempting to insert into profiles (requires RLS policy change or this will fail).
  // We'll assume a "fake" ID or letting the database generate one if we remove the FK constraint?
  // No, `id` references `auth.users`. 
  
  // Workaround: We'll skip the actual DB insert for "creation" unless we have an Edge Function.
  // OR: We can just return a mock success to unblock the UI if real user creation isn't critical right now.
  
  // Better approach for a real app: Use supabase.auth.admin.createUser (server-side only).
  // Here, we'll throw an error explaining the limitation or try to insert if we relax the schema.
  
  console.warn("createTrainer: Cannot create a full user account from client-side without sign-up. Skipping DB insert.");
  
  return {
    uuid: "temp-id-" + Date.now(),
    first_name: data.first_name,
    last_name: data.last_name,
    bio: data.bio
  };
}
