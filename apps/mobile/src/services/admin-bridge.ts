import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type { MobileUserRole } from "./auth";

const AUTO_OPEN_PREFIX = "dancecrm.adminAutoOpened.";

const getAutoOpenKey = (userId: string) => `${AUTO_OPEN_PREFIX}${userId}`;

export async function shouldAutoOpenAdmin(role: MobileUserRole | null) {
  if (role !== "owner" && role !== "super_admin") return false;
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return false;
  const stored = await AsyncStorage.getItem(getAutoOpenKey(userId));
  return !stored;
}

export async function markAutoOpenedAdmin() {
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return;
  await AsyncStorage.setItem(getAutoOpenKey(userId), new Date().toISOString());
}
