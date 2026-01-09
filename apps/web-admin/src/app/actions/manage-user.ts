'use server';

import { supabaseAdmin } from "../../lib/supabase-admin";
import type { UserRole } from "../../lib/auth";

export type ManageUserResult = {
  success: boolean;
  message?: string;
};

const requireServiceRole = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    return { success: false, message: "Server Error: Missing Service Role Key. Please configure env vars." };
  }
  return null;
};

const isSuperAdminUser = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    return { error, isSuperAdmin: false };
  }

  return { error: null, isSuperAdmin: data?.role === 'super_admin' };
};

export async function updateUserProfileAction(formData: FormData): Promise<ManageUserResult> {
  const guard = requireServiceRole();
  if (guard) return guard;

  const userId = formData.get("userId") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const role = formData.get("role") as UserRole | null;

  if (!userId) return { success: false, message: "Missing user id." };

  const { error: roleError, isSuperAdmin } = await isSuperAdminUser(userId);
  if (roleError) {
    return { success: false, message: `Failed to load user role: ${roleError.message}` };
  }
  if (isSuperAdmin) {
    return { success: false, message: "Cannot edit super admin users." };
  }

  const updates: { first_name?: string; last_name?: string; role?: UserRole; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;
  if (role) updates.role = role;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    return { success: false, message: `Failed to update user: ${error.message}` };
  }

  return { success: true };
}

export async function deleteUserAction(userId: string): Promise<ManageUserResult> {
  const guard = requireServiceRole();
  if (guard) return guard;

  if (!userId) return { success: false, message: "Missing user id." };

  const { error: roleError, isSuperAdmin } = await isSuperAdminUser(userId);
  if (roleError) {
    return { success: false, message: `Failed to load user role: ${roleError.message}` };
  }
  if (isSuperAdmin) {
    return { success: false, message: "Cannot delete super admin users." };
  }

  const { data: ownedStudios, error: ownedError } = await supabaseAdmin
    .from('studios')
    .select('uuid')
    .eq('owner_id', userId)
    .limit(1);

  if (ownedError) {
    return { success: false, message: `Failed to check owned studios: ${ownedError.message}` };
  }
  if (ownedStudios && ownedStudios.length > 0) {
    return { success: false, message: "User owns studios. Reassign or delete those studios first." };
  }

  await supabaseAdmin.from('tenant_staff').delete().eq('user_id', userId);
  await supabaseAdmin.from('room_rentals').delete().eq('renter_id', userId);
  await supabaseAdmin.from('reviews').delete().eq('user_id', userId);
  await supabaseAdmin.from('slots').update({ trainer_id: null }).eq('trainer_id', userId);

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    return { success: false, message: `Failed to delete profile: ${profileError.message}` };
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    return { success: false, message: `Deleted profile but failed to delete auth user: ${authError.message}` };
  }

  return { success: true };
}
