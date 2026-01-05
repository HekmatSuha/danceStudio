import { supabase } from "../lib/supabase";

export type DanceStyle = {
  uuid: string;
  name: string;
  description?: string;
};

export async function fetchDanceStyles() {
  const { data, error } = await supabase
    .from('dance_styles')
    .select('*');

  if (error) throw error;
  
  return data as DanceStyle[];
}
