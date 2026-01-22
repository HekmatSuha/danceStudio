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
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const gender = formData.get("gender") as string;

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'student',
          phone_number: phone || "",
          gender: gender || "F",
        },
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
          email,
          username: email,
          phone_number: phone || null,
          gender: gender || "F",
          role: "student",
          is_active: true,
        },
        { onConflict: "id" }
      );

    return { success: true, message: "Student created successfully.", userId };
  } catch (err: unknown) {
    return { success: false, message: getErrorMessage(err, "Unknown server error.") };
  }
}
