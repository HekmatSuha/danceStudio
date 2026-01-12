import { supabase } from "../lib/supabase";

export type Studio = {
  uuid: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function listStudios() {
  const { data, error } = await supabase
    .from('studios')
    .select('*');
    
  if (error) throw error;
  
  return data as Studio[];
}
