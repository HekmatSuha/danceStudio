'use server';

import { supabaseAdmin } from "../../lib/supabase-admin";

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
  
  const ownerEmail = formData.get("ownerEmail") as string;
  const ownerPassword = formData.get("ownerPassword") as string;
  const ownerFirstName = formData.get("ownerFirstName") as string;
  const ownerLastName = formData.get("ownerLastName") as string;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    return { success: false, message: "Server Error: Missing Service Role Key. Please configure env vars." };
  }

  try {
    // 1. Create the Auth User (Studio Owner)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: ownerFirstName,
        last_name: ownerLastName,
        role: 'owner'
      }
    });

    if (userError) {
      console.error("Create User Error:", userError);
      return { success: false, message: `Failed to create user: ${userError.message}` };
    }

    if (!userData.user) {
      return { success: false, message: "User creation failed unexpectedly." };
    }

    const newOwnerId = userData.user.id;

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

    // 3. Add Owner to Tenant Staff (as 'owner')
    await supabaseAdmin
      .from('tenant_staff')
      .insert({
        studio_id: studioData.uuid,
        user_id: newOwnerId,
        role: 'owner'
      });

    return { 
      success: true, 
      message: "Studio and Owner created successfully.",
      studioId: studioData.uuid,
      ownerId: newOwnerId
    };

  } catch (err: any) {
    console.error("Server Action Error:", err);
    return { success: false, message: err.message || "An unexpected error occurred." };
  }
}
