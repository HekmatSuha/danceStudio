import { supabase } from "../lib/supabase";

export type Trainer = {
  uuid: string;
  first_name: string;
  last_name: string;
  bio?: string;
  photo?: string;
};

export async function fetchTrainers(studioId?: string) {
  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .eq('role', 'instructor');

  // If studioId is provided, we might need a way to filter. 
  // For now, returning all instructors or assuming a relation exists.
  // Ideally: .eq('studio_id', studioId) if we added that column.
  
  const { data, error } = await query;

  if (error) throw error;

  return data.map((t: any) => ({
    uuid: t.id,
    first_name: t.first_name,
    last_name: t.last_name,
    photo: t.avatar_url,
  })) as Trainer[];
}
