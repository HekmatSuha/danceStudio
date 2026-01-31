'use server';

import crypto from "crypto";
import { supabaseAdmin } from "../../lib/supabase-admin";
import { getErrorMessage } from "../../lib/errors";
import { sendInstructorWelcomeEmail } from "../../lib/mailer";

export type CreateInstructorResult = {
  success: boolean;
  message?: string;
  userId?: string;
};

const generateTempPassword = (length: number = 12) => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%?";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join("");
};

export async function createInstructorAction(formData: FormData): Promise<CreateInstructorResult> {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = (formData.get("email") as string) || "";
  const normalizedEmail = email.trim().toLowerCase();
  let studioId = formData.get("studioId") as string;
  const ownerUserId = formData.get("ownerUserId") as string;
  const bio = formData.get("bio") as string;
  const photo = formData.get("photo") as string;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const loginUrl = `${appUrl}/login`;

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
    if (!normalizedEmail) {
      return { success: false, message: "Email is required." };
    }

    // 1. Create Auth User with a temporary password
    const tempPassword = generateTempPassword();
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        username: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        role: "instructor",
      },
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
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, message: "Created user but failed to link to studio: " + linkError.message };
    }

    // 3. Update Profile Bio (Optional)
    const profilePayload = {
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email: normalizedEmail,
      username: normalizedEmail,
      role: "instructor",
      is_active: true,
      bio: bio || null,
      avatar_url: photo || null,
    };
    await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: "id" });

    // 4. Email login credentials
    try {
      await sendInstructorWelcomeEmail({
        to: normalizedEmail,
        firstName,
        loginEmail: normalizedEmail,
        tempPassword,
        loginUrl,
      });
    } catch (mailError: unknown) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, message: getErrorMessage(mailError, "Failed to send credentials email.") };
    }

    return { success: true, message: "Instructor created successfully.", userId };

  } catch (err: unknown) {
    return { success: false, message: getErrorMessage(err, "Unknown server error.") };
  }
}
