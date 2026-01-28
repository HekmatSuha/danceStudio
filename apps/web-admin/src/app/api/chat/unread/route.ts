import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabaseClient } from "../../../../lib/server-supabase";

type ParticipantRow = { conversation_id?: string | null };

export async function GET(req: NextRequest) {
  const auth = await getAuthedSupabaseClient(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: participationRows, error: participationError } = await auth.supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", auth.userId);

  if (participationError) {
    return NextResponse.json({ error: participationError.message }, { status: 500 });
  }

  const conversationIds = (participationRows as ParticipantRow[] | null | undefined)
    ?.map((row) => row.conversation_id)
    .filter(Boolean) as string[] | undefined;

  if (!conversationIds?.length) {
    return NextResponse.json({ hasUnread: false, count: 0 });
  }

  const { count, error } = await auth.supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .eq("is_read", false)
    .neq("sender_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    hasUnread: (count ?? 0) > 0,
    count: count ?? 0,
  });
}
