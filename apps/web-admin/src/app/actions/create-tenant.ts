'use server';

import { supabaseAdmin } from "../../lib/supabase-admin";
import { getErrorMessage } from "../../lib/errors";

export type CreateTenantResult = {
  success: boolean;
  message?: string;
  studioId?: string;
  ownerId?: string;
};

const parseOptionalNumber = (value: FormDataEntryValue | null) => {
  if (value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function createTenantAction(formData: FormData): Promise<CreateTenantResult> {
  const name = formData.get("name") as string;
  const city = formData.get("city") as string;
  const address = formData.get("address") as string;
  const latitude = parseOptionalNumber(formData.get("latitude"));
  const longitude = parseOptionalNumber(formData.get("longitude"));
  const whatsapp = (formData.get("whatsapp") as string) || null;
  const imageFileEntry = formData.get("studioImage");
  const imageFile = imageFileEntry instanceof File ? imageFileEntry : null;
  
  const ownerEmail = (formData.get("ownerEmail") as string) || "";
  const ownerFirstName = (formData.get("ownerFirstName") as string) || "";
  const ownerLastName = (formData.get("ownerLastName") as string) || "";
  const sendInviteRaw = formData.get("sendInvite");
  const sendInvite = sendInviteRaw === "on" || sendInviteRaw === "true" || sendInviteRaw === "1";
  const normalizedEmail = ownerEmail.trim().toLowerCase();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset`;

  if (!whatsapp) {
    return { success: false, message: "WhatsApp is required for the studio." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    return { success: false, message: "Server Error: Missing Service Role Key. Please configure env vars." };
  }

  try {
    let newOwnerId: string | null = null;

    if (sendInvite) {
      if (!normalizedEmail) {
        return { success: false, message: "Owner email is required to send an invite." };
      }
      if (!ownerFirstName.trim() || !ownerLastName.trim()) {
        return { success: false, message: "Owner first and last name are required to send an invite." };
      }

      // 1. Invite Auth User (sends email to set password)
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: {
            username: normalizedEmail,
            first_name: ownerFirstName,
            last_name: ownerLastName,
            role: "owner",
            must_reset_password: true,
          },
          redirectTo: resetUrl,
        }
      );

      if (userError) {
        console.error("Invite User Error:", userError);
        return { success: false, message: `Failed to invite owner: ${userError.message}` };
      }

      if (!userData.user) {
        return { success: false, message: "Owner invite failed unexpectedly." };
      }

      newOwnerId = userData.user.id;
    }

    // 2. Create the Studio
    // The profile should be created automatically by the DB trigger 'on_auth_user_created'
    // using the metadata provided above.
    
    // We wait a brief moment to ensure trigger consistency or just rely on eventual consistency?
    // RLS bypass via supabaseAdmin means we don't strictly need the profile to exist to insert the studio
    // (unless there is a FK constraint on owner_id -> profiles.id, which there IS).
    // The trigger is usually synchronous in Postgres for 'AFTER INSERT', so it should be fine.
    
    const { data: studioData, error: studioError } = await supabaseAdmin
      .from('studios')
      .insert({
        name,
        city,
        address,
        latitude,
        longitude,
        whatsapp,
        owner_id: newOwnerId
      })
      .select()
      .single();

    if (studioError) {
      console.error("Create Studio Error:", studioError);
      // Rollback user creation? Ideally yes, but complex.
      // For now, return error.
      return { success: false, message: `Created user but failed to create studio: ${studioError.message}` };
    }

    // 3. Upload studio image if provided
    if (imageFile && imageFile.size > 0) {
      const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "studio.jpg";
      const path = `${studioData.uuid}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("studio-images")
        .upload(path, imageFile, { upsert: true });

      if (uploadError) {
        console.warn("Studio image upload failed:", uploadError);
        return {
          success: true,
          message: `Studio created, but image upload failed: ${uploadError.message}`,
          studioId: studioData.uuid,
          ownerId: newOwnerId || undefined
        };
      }

      const { data } = supabaseAdmin.storage.from("studio-images").getPublicUrl(path);
      const imageUrl = data.publicUrl;

      await supabaseAdmin
        .from("studios")
        .update({ image_url: imageUrl })
        .eq("uuid", studioData.uuid);
    }

    // 4. Add Owner to Tenant Staff (as 'owner')
    if (newOwnerId) {
      await supabaseAdmin
        .from('tenant_staff')
        .insert({
          studio_id: studioData.uuid,
          user_id: newOwnerId,
          role: 'owner'
        });
    }

    return { 
      success: true, 
      message: sendInvite
        ? "Studio created and owner invite sent."
        : "Studio created successfully (no owner invite sent).",
      studioId: studioData.uuid,
      ownerId: newOwnerId || undefined
    };

  } catch (err: unknown) {
    console.error("Server Action Error:", err);
    return { success: false, message: getErrorMessage(err) };
  }
}
