'use client';

import { supabase } from "./supabase";

export type UserRole = "owner" | "instructor" | "student" | "super_admin";

export type AccountProfile = {
  uuid: string;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  roles?: string; 
  role?: UserRole;
  is_staff?: boolean;
  is_superuser?: boolean;
  gender?: string;
  dance_level?: string;
  interests?: string[];
  avatar_url?: string | null;
};

type RoleInput =
  | Array<{ code?: string | null } | string>
  | string
  | null
  | undefined;

export const toUserRole = (roles?: RoleInput, user?: Partial<AccountProfile>): UserRole => {
  if (user?.is_superuser) return "super_admin";
  
  let rolesStr = "";
  if (Array.isArray(roles)) {
    rolesStr = roles
      .map((r) => {
        if (typeof r === "string") return r;
        return r?.code ?? "";
      })
      .join(",")
      .toUpperCase();
  } else if (typeof roles === "string") {
    rolesStr = roles.toUpperCase();
  }

  if (rolesStr.includes("SUPER_ADMIN")) return "super_admin";
  if (rolesStr.includes("STUDIO_OWNER") || rolesStr.includes("ADMIN") || rolesStr.includes("OWNER")) return "owner";
  if (rolesStr.includes("TRAINER") || rolesStr.includes("INSTRUCTOR")) return "instructor";
  return "student";
};

export async function registerUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  gender?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        username: input.email.trim().toLowerCase(),
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone_number: input.phone?.trim() || "",
        gender: input.gender || "F",
        role: input.role,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signUpWithEmail(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  gender?: string;
}) {
  await registerUser(input);
  // Sign in to obtain tokens
  return signInWithEmail({ email: input.email, password: input.password });
}

export async function signInWithEmail(params: { email: string; password: string }) {
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email.trim(),
    password: params.password,
  });

  if (error) throw error;

  const profile = await fetchProfile();
  return { user: profile, role: (profile.role || "student") as UserRole };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function sendResetPassword(email: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const redirectTo = `${appUrl.replace(/\/$/, "")}/reset`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function confirmPasswordReset(password: string) {
  // Requires an authenticated recovery session from the email link
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function fetchProfile(): Promise<AccountProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch from profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;

  const meta = user.user_metadata || {};

  const finalProfile: AccountProfile = {
    uuid: user.id,
    username: profile?.username || meta.username || user.email || "",
    email: user.email || null,
    first_name: profile?.first_name || meta.first_name || "",
    last_name: profile?.last_name || meta.last_name || "",
    phone_number: profile?.phone_number || meta.phone_number,
    role: profile?.role || meta.role,
    roles: profile?.role || meta.role,
    gender: profile?.gender || meta.gender,
    dance_level: profile?.dance_level,
    interests: profile?.interests,
    avatar_url: profile?.avatar_url || meta.avatar_url || null,
    is_staff: ['owner', 'instructor', 'super_admin'].includes(profile?.role || meta.role || ''),
    is_superuser: (profile?.role || meta.role) === 'super_admin',
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

  const updates: { [key: string]: string | string[] | null | undefined } = {
    updated_at: new Date().toISOString(),
  };
  if (input.firstName !== undefined) updates.first_name = input.firstName;
  if (input.lastName !== undefined) updates.last_name = input.lastName;
  if (input.phone !== undefined) updates.phone_number = input.phone;
  if (input.gender !== undefined) updates.gender = input.gender;
  if (input.danceLevel !== undefined) updates.dance_level = input.danceLevel;
  if (input.interests !== undefined) updates.interests = input.interests;
  if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  
  return fetchProfile();
}
