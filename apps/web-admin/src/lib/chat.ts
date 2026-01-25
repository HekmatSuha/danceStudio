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
};

export async function fetchConversations(userId: string) {
  // distinct conversations where user is a participant
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (partError) {
    console.error("Error fetching conversation_participants:", partError);
    throw new Error(formatSupabaseError(partError));
  }

  const conversationIds = participations.map((p) => p.conversation_id);

  if (conversationIds.length === 0) return [];

  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select(`
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
      )
    `)
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (convError) {
    console.error("Error fetching conversations:", convError);
    throw new Error(formatSupabaseError(convError));
  }

  // Fetch last message for each conversation
  const conversationsWithLastMessage = await Promise.all(
    conversations.map(async (conv) => {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        ...conv,
        last_message: messages?.[0] || null,
      };
    })
  );

  return conversationsWithLastMessage as unknown as Conversation[];
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
