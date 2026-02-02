import { supabase } from "../lib/supabase";

export type Studio = {
  uuid: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
  image_url?: string | null;
};

export async function listStudios() {
  const { data, error } = await supabase
    .from('studios')
    .select('uuid, name, address, city, latitude, longitude, whatsapp, image_url');
    
  if (error) throw error;
  
  return data as Studio[];
}

export async function fetchMyStudios() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [staffResult, ownedResult] = await Promise.all([
    supabase
      .from('tenant_staff')
      .select(`
        studio:studios(uuid, name, address, city, latitude, longitude, whatsapp, image_url)
      `)
      .eq('user_id', user.id),
    supabase
      .from('studios')
      .select('uuid, name, address, city, latitude, longitude, whatsapp, image_url')
      .eq('owner_id', user.id)
  ]);

  const { data: staffData, error: staffError } = staffResult;
  const { data: ownedData, error: ownedError } = ownedResult;

  if (staffError) throw staffError;
  if (ownedError) throw ownedError;

  const studios = new Map<string, Studio>();

  (staffData as { studio?: Studio | null }[] | null | undefined)?.forEach((item) => {
    if (item.studio?.uuid) studios.set(item.studio.uuid, item.studio);
  });

  (ownedData as Studio[] | null | undefined)?.forEach((studio) => {
    if (studio?.uuid) studios.set(studio.uuid, studio);
  });

  return Array.from(studios.values());
}

export async function createStudio(input: {
  name: string;
  city: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from('studios')
    .insert({
      name: input.name,
      city: input.city,
      address: input.address,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      whatsapp: input.whatsapp ?? null,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Studio;
}

export async function getStudio(studioId: string) {
  const { data, error } = await supabase
    .from('studios')
    .select('uuid, name, address, city, latitude, longitude, whatsapp, image_url')
    .eq('uuid', studioId)
    .maybeSingle();

  if (error) throw error;
  return data as Studio | null;
}
