import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MobileUserRole = "owner" | "instructor" | "student" | "super_admin";

const ROLE_KEY = "dancecrm.role";

function normalizeRole(raw: unknown): MobileUserRole | null {
  const value = Array.isArray(raw)
    ? raw.find((item) => typeof item === "string")
    : typeof raw === "string"
      ? raw
      : null;
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (
    normalized === "owner" ||
    normalized === "studio_owner" ||
    normalized === "studioowner"
  ) {
    return "owner";
  }
  if (normalized === "instructor" || normalized === "teacher") {
    return "instructor";
  }
  if (normalized === "super_admin" || normalized === "superadmin" || normalized === "admin") {
    return "super_admin";
  }
  if (normalized === "student" || normalized === "client") {
    return "student";
  }
  return null;
}

export type AccountProfile = {
  uuid: string;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  roles?: string; // keeping for compatibility, mapped from role
  role?: MobileUserRole;
  dance_level?: string;
  interests?: string[];
  gender?: string;
};

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  gender?: string;
  role?: MobileUserRole;
}) {
  const role = input.role ?? "student";
  
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        username: input.email.trim().toLowerCase(),
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone_number: input.phone?.trim() || "",
        gender: input.gender?.trim() || "M",
        role: role,
      },
    },
  });

  if (error) throw error;
  
  // If session exists immediately (no email confirmation required), set role
  if (data.session) {
    await setStoredRole(role);
  }
  
  return data.user;
}

export async function login(emailOrUsername: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailOrUsername.trim(),
    password,
  });

  if (error) throw error;

  const profile = await fetchProfile();
  // Role is stored in profile or metadata. 
  // We prefer the profile table if it exists, otherwise metadata.
  const normalizedRole = normalizeRole(profile.role) ?? "student";
  await setStoredRole(normalizedRole);
  
  return { profile, role: normalizedRole };
}

export async function fetchProfile(): Promise<AccountProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Try to fetch from profiles table
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // legitimate error
    console.warn("Error fetching profile:", error);
  }

  // Fallback to user metadata if profile table entry is missing (e.g. latency)
  const meta = user.user_metadata || {};
  const appMeta = user.app_metadata || {};
  const rawRole =
    profile?.role ??
    profile?.roles ??
    meta.role ??
    meta.roles ??
    (meta as any).user_role ??
    appMeta.role ??
    appMeta.roles ??
    (appMeta as any).user_role;
  
  const finalProfile: AccountProfile = {
    uuid: user.id,
    username: profile?.username || meta.username || user.email || "",
    email: user.email || null,
    first_name: profile?.first_name || meta.first_name || "",
    last_name: profile?.last_name || meta.last_name || "",
    phone_number: profile?.phone_number || meta.phone_number,
    avatar_url: profile?.avatar_url || meta.avatar_url || (meta as any).avatarUrl,
    gender: profile?.gender || meta.gender,
    role: normalizeRole(rawRole) ?? undefined,
    roles: rawRole, // compatibility
    dance_level: profile?.dance_level,
    interests: profile?.interests,
  };

  return finalProfile;
}

export async function updateProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  danceLevel?: string;
  interests?: string[];
  avatarUrl?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const updates: any = {};
  if (input.firstName !== undefined) updates.first_name = input.firstName;
  if (input.lastName !== undefined) updates.last_name = input.lastName;
  if (input.phone !== undefined) updates.phone_number = input.phone;
  if (input.gender !== undefined) updates.gender = input.gender;
  if (input.danceLevel !== undefined) updates.dance_level = input.danceLevel;
  if (input.interests !== undefined) updates.interests = input.interests;
  if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  
  return fetchProfile();
}

export async function logout() {
  await supabase.auth.signOut();
  await clearStoredRole();
}

export async function setStoredRole(role: MobileUserRole) {
  const normalized = normalizeRole(role) ?? "student";
  await AsyncStorage.setItem(ROLE_KEY, normalized);
}

export async function getStoredRole(): Promise<MobileUserRole | null> {
  const raw = await AsyncStorage.getItem(ROLE_KEY);
  return normalizeRole(raw);
}

export async function clearStoredRole() {
  await AsyncStorage.removeItem(ROLE_KEY);
}

export async function getCurrentRole(): Promise<MobileUserRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await clearStoredRole();
    return null;
  }

  let profile: AccountProfile | null = null;
  try {
    profile = await fetchProfile();
  } catch {
    profile = null;
  }

  const normalized = normalizeRole(profile?.role ?? profile?.roles);
  if (normalized) {
    await setStoredRole(normalized);
    return normalized;
  }

  await clearStoredRole();
  return null;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Supabase handles confirmation via link, but if we need a code flow we might need to adjust.
// For now, we stub this as the mobile flow might expect a link redirect.
export async function confirmPasswordReset(code: string, password: string) {
  // In Supabase, usually the user clicks a link that logs them in, then they update password.
  // This function might need to be 'updatePassword' called after the link redirects them back to app.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
