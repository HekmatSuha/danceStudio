import { supabase } from "./supabase";

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
    throw partError;
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
    throw convError;
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

  return conversationsWithLastMessage as Conversation[];
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

  if (error) throw error;

  // Update conversation updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as Message;
}

export async function createConversation(userIds: string[]) {
  // This is a simplified creation logic. 
  // In a real app, you'd check if a conversation between these exact users already exists.
  
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({})
    .select()
    .single();

  if (convError) throw convError;

  const participants = userIds.map((uid) => ({
    conversation_id: conversation.id,
    user_id: uid,
  }));

  const { error: partError } = await supabase
    .from("conversation_participants")
    .insert(participants);

  if (partError) throw partError;

  return conversation;
}