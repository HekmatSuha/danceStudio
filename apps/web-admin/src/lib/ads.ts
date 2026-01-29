import { supabase } from "./supabase";

export type Advertisement = {
  id: string;
  studio_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
};

export async function fetchAdvertisements(studioIds: string[]) {
  const { data, error } = await supabase
    .from("advertisements")
    .select("*")
    .in("studio_id", studioIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  // Map snake_case to camelCase if needed, but here we used snake_case in DB
  // The type definition above uses snake_case for DB fields if we want exact match,
  // or we can map it. For simplicity, let's stick to DB column names in the type for now,
  // or use the 'view' type.
  // The UI currently expects: id, title, description, imageUrl, isActive.
  // I will map it here to match UI expectations or update UI.
  // It is better to return the raw DB shape and let UI adapt, or map here.
  // I will return raw DB shape and update UI to match, as that is cleaner for new code.
  return (data || []) as Advertisement[];
}

export async function createAdvertisement(ad: {
  studio_id: string;
  title: string;
  description?: string;
  image_url?: string;
}) {
  const { data, error } = await supabase
    .from("advertisements")
    .insert([ad])
    .select()
    .single();

  if (error) throw error;
  return data as Advertisement;
}

export async function deleteAdvertisement(id: string) {
  const { error } = await supabase.from("advertisements").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAdvertisement(id: string, updates: Partial<Advertisement>) {
  const { data, error } = await supabase
    .from("advertisements")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Advertisement;
}
