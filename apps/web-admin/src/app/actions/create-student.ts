'use server';

import { supabaseAdmin } from "../../lib/supabase-admin";
import { getErrorMessage } from "../../lib/errors";

export type CreateStudentResult = {
  success: boolean;
  message?: string;
  userId?: string;
};

export async function createStudentAction(formData: FormData): Promise<CreateStudentResult> {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = (formData.get("email") as string) || "";
  const normalizedEmail = email.trim().toLowerCase();
  const phone = formData.get("phone") as string;
  const gender = formData.get("gender") as string;
  const studioId = formData.get("studioId") as string;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset`;

  try {
    if (!studioId) {
      return { success: false, message: "Studio ID is required to create a student." };
    }
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'student',
          phone_number: phone || "",
          gender: gender || "F",
          must_reset_password: true,
        },
        redirectTo: resetUrl,
      }
    );

    if (userError) return { success: false, message: userError.message };
    if (!userData.user) return { success: false, message: "Failed to create user." };

    const userId = userData.user.id;
    await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          email: normalizedEmail,
          username: normalizedEmail,
          phone_number: phone || null,
          gender: gender || "F",
          role: "student",
          is_active: true,
        },
        { onConflict: "id" }
      );

    if (studioId) {
      await supabaseAdmin
        .from("student_studios")
        .upsert(
          { studio_id: studioId, student_id: userId },
          { onConflict: "studio_id,student_id" }
        );
    }

    return { success: true, message: "Student created successfully.", userId };
  } catch (err: unknown) {
    return { success: false, message: getErrorMessage(err, "Unknown server error.") };
  }
}
