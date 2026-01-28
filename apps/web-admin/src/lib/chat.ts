import { supabase } from "./supabase";

const formatSupabaseError = (error: unknown) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
};

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
  participants: {
    user_id: string;
    user: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  }[];
  last_message?: Message;
  unread_count: number;
};

type ConversationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  participants: {
    user_id: string;
    user:
      | {
          first_name: string;
          last_name: string;
          avatar_url?: string;
        }
      | {
          first_name: string;
          last_name: string;
          avatar_url?: string;
        }[];
  }[];
  messages?: Message[] | null;
};

export async function fetchConversations(userId: string) {
  const { data: membership, error: membershipError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membershipError) {
    console.error("Error fetching conversation membership:", membershipError);
    throw new Error(formatSupabaseError(membershipError));
  }

  const conversationIds = (membership || []).map((row) => row.conversation_id);
  if (conversationIds.length === 0) return [];

  const { data: unreadRows, error: unreadError } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .eq("is_read", false)
    .neq("sender_id", userId);

  if (unreadError) {
    console.error("Error fetching unread messages:", unreadError);
    throw new Error(formatSupabaseError(unreadError));
  }

  const unreadCounts = (unreadRows || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.conversation_id] = (acc[row.conversation_id] || 0) + 1;
    return acc;
  }, {});

  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select(
      `
      id,
      created_at,
      updated_at,
      participants:conversation_participants(
        user_id,
        user:profiles(
          first_name,
          last_name,
          avatar_url
        )
      ),
      messages:messages(
        id,
        conversation_id,
        sender_id,
        content,
        created_at,
        is_read
      )
    `
    )
    .in("id", conversationIds)
    .order("updated_at", { ascending: false })
    .order("created_at", { foreignTable: "messages", ascending: false })
    .limit(1, { foreignTable: "messages" });

  if (convError) {
    console.error("Error fetching conversations:", convError);
    throw new Error(formatSupabaseError(convError));
  }

  const payload = ((conversations || []) as ConversationRow[]).map((conv) => {
    const lastMessage = conv.messages?.[0];
    const participants = (conv.participants || []).map((participant) => {
      const user = Array.isArray(participant.user)
        ? participant.user[0]
        : participant.user;
      return {
        user_id: participant.user_id,
        user: {
          first_name: user?.first_name ?? "",
          last_name: user?.last_name ?? "",
          avatar_url: user?.avatar_url,
        },
      };
    });

    return {
      id: conv.id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants,
      last_message: lastMessage ?? undefined,
      unread_count: unreadCounts[conv.id] ?? 0,
    };
  });

  return payload;
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (error) throw new Error(formatSupabaseError(error));

  // Update conversation updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as Message;
}

export async function createConversation(userIds: string[], creatorId?: string) {
  if (creatorId && userIds.length === 2) {
    const targetUserId = userIds.find((uid) => uid !== creatorId);
    if (targetUserId) {
      const { data, error } = await supabase.rpc("create_conversation_with_participants", {
        target_user_id: targetUserId,
      });
      if (error) throw new Error(formatSupabaseError(error));
      return { id: data } as { id: string };
    }
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({})
    .select()
    .single();

  if (convError) throw new Error(formatSupabaseError(convError));

  const creator = creatorId ?? userIds[0];
  if (!creator) throw new Error("Missing conversation creator.");

  const { error: creatorError } = await supabase
    .from("conversation_participants")
    .insert({
      conversation_id: conversation.id,
      user_id: creator,
    });

  if (creatorError) throw new Error(formatSupabaseError(creatorError));

  const otherIds = userIds.filter((uid) => uid !== creator);
  if (otherIds.length > 0) {
    const { error: partError } = await supabase
      .from("conversation_participants")
      .insert(
        otherIds.map((uid) => ({
          conversation_id: conversation.id,
          user_id: uid,
        }))
      );

    if (partError) throw new Error(formatSupabaseError(partError));
  }

  return conversation;
}

export async function getOrCreateConversation(currentUserId: string, targetUserId: string) {
  // 1. Find conversations where current user is a participant
  const { data: myConversations, error: myError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  if (myError) throw myError;

  const conversationIds = myConversations.map(c => c.conversation_id);

  if (conversationIds.length > 0) {
    // 2. Check if target user is also a participant in any of these conversations
    // We assume 1-on-1 chats for now, or just return the first match
    const { data: existing, error: matchError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", targetUserId)
      .in("conversation_id", conversationIds)
      .limit(1)
      .maybeSingle();

    if (matchError) throw new Error(formatSupabaseError(matchError));

    if (existing) {
      return existing.conversation_id;
    }
  }

  // 3. Create new if not found
  const newConv = await createConversation([currentUserId, targetUserId], currentUserId);
  return newConv.id;
}
