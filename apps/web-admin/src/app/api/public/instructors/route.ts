import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withServerCache } from "../../../../lib/server-cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  try {
    const data = await withServerCache("public:instructors", 30000, async () => {
      const supabase = supabaseServiceRoleKey
        ? createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

      const { data: staffRows, error } = await supabase
        .from("tenant_staff")
        .select("role, user:profiles(id, first_name, last_name, bio, avatar_url), studio:studios(name, city)")
        .eq("role", "instructor");

      if (error) throw new Error(error.message);

      const mapped = (staffRows || [])
        .map((row: any) => ({
          id: row.user?.id || null,
          first_name: row.user?.first_name ?? null,
          last_name: row.user?.last_name ?? null,
          bio: row.user?.bio ?? null,
          avatar_url: row.user?.avatar_url ?? null,
          studio_name: row.studio?.name ?? null,
          studio_city: row.studio?.city ?? null,
        }))
        .filter((row: any) => row.id);

      const unique = new Map<string, any>();
      mapped.forEach((row: any) => {
        if (!unique.has(row.id)) unique.set(row.id, row);
      });

      return Array.from(unique.values());
    });

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load instructors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
