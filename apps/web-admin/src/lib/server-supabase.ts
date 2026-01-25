
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

type AuthedClient = {
  supabase: SupabaseClient;
  userId: string;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eqztgdhhhhrmdfvlgnhx.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_xzxk7Avlv3abcYCGd00abQ_pzTl3lVa";

export async function getAuthedSupabaseClient(
  req: NextRequest,
): Promise<AuthedClient | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;

  return { supabase, userId: data.user.id };
}
