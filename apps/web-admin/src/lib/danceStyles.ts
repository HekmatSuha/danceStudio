'use client';

import { supabase } from "./supabase";
import { withCache } from "./cache";

export type DanceStyle = {
  uuid: string;
  name: string;
  description?: string;
};

export async function fetchDanceStyles() {
  return withCache("dance_styles:all", 60000, async () => {
    const { data, error } = await supabase
      .from('dance_styles')
      .select('*')
      .order('name');

    if (error) throw error;

    return data.map((d: any) => ({
      uuid: d.uuid,
      name: d.name,
      description: d.description,
    })) as DanceStyle[];
  });
}
