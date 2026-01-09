'use server';

import { supabaseAdmin } from "../../lib/supabase-admin";
import { getErrorMessage } from "../../lib/errors";

export type CreateInstructorResult = {
  success: boolean;
  message?: string;
  userId?: string;
};

export async function createInstructorAction(formData: FormData): Promise<CreateInstructorResult> {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  let studioId = formData.get("studioId") as string;
  const ownerUserId = formData.get("ownerUserId") as string;
  const bio = formData.get("bio") as string;

  if (!studioId) {
    if (!ownerUserId) {
      return { success: false, message: "Studio ID is required." };
    }

    const { data: ownedStudios, error: ownedError } = await supabaseAdmin
      .from('studios')
      .select('uuid')
      .eq('owner_id', ownerUserId)
      .limit(1);

    if (ownedError) {
      return { success: false, message: "Failed to resolve studio for owner: " + ownedError.message };
    }

    if (!ownedStudios || ownedStudios.length === 0) {
      return { success: false, message: "No studio found for this owner. Please provide a Studio ID." };
    }

    studioId = ownedStudios[0].uuid;
  }

  try {
    // 1. Create Auth User
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'instructor'
      }
    });

    if (userError) return { success: false, message: userError.message };
    if (!userData.user) return { success: false, message: "Failed to create user." };

    const userId = userData.user.id;

    // 2. Link to Studio (Tenant Staff)
    const { error: linkError } = await supabaseAdmin
      .from('tenant_staff')
      .insert({
        studio_id: studioId,
        user_id: userId,
        role: 'instructor'
      });

    if (linkError) {
      // Cleanup user if link fails? 
      // await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, message: "Created user but failed to link to studio: " + linkError.message };
    }

    // 3. Update Profile Bio (Optional)
    if (bio) {
        await supabaseAdmin
            .from('profiles')
            .update({ bio: bio, is_active: true }) // bio column needs to exist in profiles!
            .eq('id', userId);
    } else {
        await supabaseAdmin
            .from('profiles')
            .update({ is_active: true })
            .eq('id', userId);
    }

    return { success: true, message: "Instructor created successfully.", userId };

  } catch (err: unknown) {
    return { success: false, message: getErrorMessage(err, "Unknown server error.") };
  }
}
