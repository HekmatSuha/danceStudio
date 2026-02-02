'use server';

import { supabaseAdmin } from "../../lib/supabase-admin";
import { getErrorMessage } from "../../lib/errors";

export type InviteStudioOwnerResult = {
  success: boolean;
  message?: string;
  ownerId?: string;
};

export async function inviteStudioOwnerAction(formData: FormData): Promise<InviteStudioOwnerResult> {
  const studioId = (formData.get("studioId") as string) || "";
  const firstName = (formData.get("firstName") as string) || "";
  const lastName = (formData.get("lastName") as string) || "";
  const email = (formData.get("email") as string) || "";
  const normalizedEmail = email.trim().toLowerCase();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset`;

  if (!studioId) {
    return { success: false, message: "Studio ID is required." };
  }
  if (!normalizedEmail) {
    return { success: false, message: "Owner email is required." };
  }
  if (!firstName.trim() || !lastName.trim()) {
    return { success: false, message: "Owner first and last name are required." };
  }

  try {
    const { data: studio, error: studioError } = await supabaseAdmin
      .from("studios")
      .select("uuid, owner_id")
      .eq("uuid", studioId)
      .single();

    if (studioError) {
      return { success: false, message: `Failed to load studio: ${studioError.message}` };
    }

    if (studio?.owner_id) {
      return { success: false, message: "This studio already has an owner. Remove the owner first before sending a new invite." };
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          username: normalizedEmail,
          first_name: firstName,
          last_name: lastName,
          role: "owner",
          must_reset_password: true,
        },
        redirectTo: resetUrl,
      }
    );

    if (userError) {
      return { success: false, message: `Failed to invite owner: ${userError.message}` };
    }

    if (!userData.user) {
      return { success: false, message: "Owner invite failed unexpectedly." };
    }

    const ownerId = userData.user.id;

    await supabaseAdmin
      .from("studios")
      .update({ owner_id: ownerId })
      .eq("uuid", studioId);

    await supabaseAdmin
      .from("tenant_staff")
      .insert({
        studio_id: studioId,
        user_id: ownerId,
        role: "owner",
      });

    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: ownerId,
          first_name: firstName,
          last_name: lastName,
          email: normalizedEmail,
          username: normalizedEmail,
          role: "owner",
          is_active: true,
        },
        { onConflict: "id" }
      );

    return { success: true, message: "Owner invite sent successfully.", ownerId };
  } catch (err: unknown) {
    return { success: false, message: getErrorMessage(err, "Unknown server error.") };
  }
}
