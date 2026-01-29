import { supabase } from "./supabase";

export type Notification = {
  id: string;
  studio_id: string;
  title: string;
  body: string;
  target_audience: string;
  created_at: string;
};

export async function createNotification(notification: {
  studio_id: string;
  title: string;
  body: string;
  target_audience: string;
}) {
  const { data, error } = await supabase
    .from("notifications")
    .insert([notification])
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

export async function fetchNotifications(studioIds: string[]) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .in("studio_id", studioIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Notification[];
}
