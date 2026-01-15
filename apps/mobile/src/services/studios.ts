import { supabase } from "../lib/supabase";

export type Studio = {
  uuid: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
};

export async function listStudios() {
  const { data, error } = await supabase
    .from('studios')
    .select('uuid, name, address, city, latitude, longitude, whatsapp');
    
  if (error) throw error;
  
  return data as Studio[];
}

export async function getStudio(studioId: string) {
  const { data, error } = await supabase
    .from('studios')
    .select('uuid, name, address, city, latitude, longitude, whatsapp')
    .eq('uuid', studioId)
    .maybeSingle();

  if (error) throw error;
  return data as Studio | null;
}
