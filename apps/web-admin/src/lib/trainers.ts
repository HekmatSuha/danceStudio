'use client';

import { supabase } from "./supabase";
import { withCache } from "./cache";
import { createInstructorAction } from "../app/actions/create-instructor";

export type Trainer = {
  uuid: string;
  first_name: string;
  last_name: string;
  bio?: string;
  photo?: string | null;
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

type TrainerRow = {
  studio_id: string;
  studio?: {
    name?: string | null;
    city?: string | null;
    address?: string | null;
  } | null;
  user: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    is_active?: boolean | null;
  };
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

    const trainers = (data as unknown as TrainerRow[]).map((item) => ({
      uuid: item.user.id, // The User/Profile ID is the primary "Trainer" ID
      first_name: item.user.first_name || "",
      last_name: item.user.last_name || "",
      bio: item.user.bio ?? undefined,
      photo: item.user.avatar_url ?? null,
      is_active: item.user.is_active ?? true,
      studio: item.studio_id,
      studio_details: item.studio ?? undefined,
    })) as Trainer[];

    return trainers;
  });
}

export async function createTrainer(data: {
  first_name: string;
  last_name: string;
  email: string;
  bio?: string;
  photo?: string | null;
  studio?: string | null;
}) {
  const formData = new FormData();
  formData.append("firstName", data.first_name);
  formData.append("lastName", data.last_name);
  formData.append("email", data.email);
  if (data.bio) formData.append("bio", data.bio);
  if (data.photo) formData.append("photo", data.photo);
  if (data.studio) formData.append("studioId", data.studio);

  const result = await createInstructorAction(formData);

  if (!result.success || !result.userId) {
    throw new Error(result.message || "Failed to create trainer");
  }

  return {
    uuid: result.userId,
    first_name: data.first_name,
    last_name: data.last_name,
    bio: data.bio,
    photo: data.photo,
    studio: data.studio,
  };
}
