"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { MoreVertical, Phone, Search, Send, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuthUser } from "../../lib/useAuthUser";
import {
  fetchConversations,
  fetchChatContacts,
  fetchMessages,
  markMessagesRead,
  getOrCreateConversation,
  sendMessage,
  type Conversation,
  type Message,
} from "../../lib/chat";
import { supabase } from "../../lib/supabase";

function ChatContent() {
  const { user } = useAuthUser();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get("id");
  const participantId = searchParams.get("participantId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [contacts, setContacts] = useState<
    Array<{ id: string; first_name: string | null; last_name: string | null; role?: string | null }>
  >([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (urlChatId) {
      setSelectedChatId(urlChatId);
    }
  }, [urlChatId]);

  const loadConversations = async (selectId?: string) => {
    if (!user) return;

    try {
      const data = await fetchConversations(user.uuid);
      setConversations(data);
      if (selectId) setSelectedChatId(selectId);
    } catch (err) {
      console.error("Failed to load conversations", JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (!user || !participantId || urlChatId) return;
    handleStartChat(participantId);
  }, [user, participantId, urlChatId]);

  useEffect(() => {
    if (!user) return;
    setContactsLoading(true);
    setContactsError(null);

    const loadContacts = async () => {
      try {
        const data = await fetchChatContacts(user.uuid);
        setContacts(data);
      } catch (err) {
        console.error("Failed to load chat contacts", err);
        setContactsError("Unable to load contacts.");
      } finally {
        setContactsLoading(false);
      }
    };

    loadContacts();
  }, [user]);

  useEffect(() => {
    if (!selectedChatId) return;

    const channel = supabase
      .channel(`chat:${selectedChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedChatId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);

          if (user && newMsg.sender_id !== user.uuid) {
            void markMessagesRead(selectedChatId, user.uuid).then(() => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.sender_id === user.uuid ? msg : { ...msg, is_read: true }
                )
              );
            });
          }

          setConversations((prev) =>
            prev
              .map((conv) =>
                conv.id === selectedChatId
                  ? {
                      ...conv,
                      last_message: newMsg,
                      updated_at: newMsg.created_at,
                      unread_count:
                        newMsg.sender_id === user?.uuid ? conv.unread_count : 0,
                    }
                  : conv
              )
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) return;

    setMessages([]);
    fetchMessages(selectedChatId)
      .then(async (rows) => {
        setMessages(rows);
        if (user) {
          try {
            await markMessagesRead(selectedChatId, user.uuid);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.sender_id === user.uuid ? msg : { ...msg, is_read: true }
              )
            );
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === selectedChatId ? { ...conv, unread_count: 0 } : conv
              )
            );
          } catch (err) {
            console.error("Failed to mark messages as read", err);
          }
        }
      })
      .catch((err) => console.error("Failed to load messages", err));
  }, [selectedChatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputText.trim() || !selectedChatId || !user) return;

    setSending(true);
    try {
      await sendMessage(selectedChatId, user.uuid, inputText);
      setInputText("");
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    if (!user) return null;
    return conv.participants.find((participant) => participant.user_id !== user.uuid)?.user;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const filteredConversations = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((chat) => {
      const other = getOtherParticipant(chat);
      const name = other ? `${other.first_name} ${other.last_name}`.toLowerCase() : "";
      const lastMsg = chat.last_message?.content?.toLowerCase() || "";
      return name.includes(query) || lastMsg.includes(query);
    });
  }, [conversations, searchText, user]);

  const filteredContacts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) => {
      const name = `${contact.first_name || ""} ${contact.last_name || ""}`.trim().toLowerCase();
      const role = contact.role?.toLowerCase() || "";
      return name.includes(query) || role.includes(query);
    });
  }, [contacts, searchText]);

  const handleStartChat = async (contactId: string) => {
    if (!user) return;
    setCreateError(null);
    try {
      const conversationId = await getOrCreateConversation(user.uuid, contactId);
      await loadConversations(conversationId);
    } catch (err) {
      console.error("Failed to create conversation", err);
      const message = err instanceof Error && err.message ? err.message : "Unknown error";
      setCreateError(`Unable to start a new chat: ${message}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading chats...</div>;
  }

  const selectedConversation = conversations.find((conv) => conv.id === selectedChatId);
  const otherParticipant = selectedConversation ? getOtherParticipant(selectedConversation) : null;

  return (
    <div className="h-[calc(100vh-64px)] flex bg-white overflow-hidden">
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all outline-none text-sm"
              placeholder="Search conversations..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">No conversations yet</div>
          ) : (
            filteredConversations.map((chat) => {
              const other = getOtherParticipant(chat);
              const name = other ? `${other.first_name} ${other.last_name}` : "Unknown User";
              const initials = other ? getInitials(other.first_name, other.last_name) : "?";
              const lastMsg = chat.last_message?.content || "No messages yet";
              const lastFromMe = chat.last_message?.sender_id === user?.uuid;
              const lastPrefix = chat.last_message
                ? lastFromMe
                  ? "You: "
                  : `${other?.first_name || "Unknown"}: `
                : "";
              const time = chat.last_message ? formatTime(chat.last_message.created_at) : "";
              const hasUnread = chat.unread_count > 0 && !lastFromMe;

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-slate-100 hover:bg-slate-100 ${
                    selectedChatId === chat.id
                      ? "bg-white border-l-4 border-l-purple-600 shadow-sm"
                      : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm bg-purple-100 text-purple-600">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3
                        className={`font-semibold truncate ${
                          hasUnread ? "text-slate-900" : "text-slate-900/80"
                        }`}
                      >
                        {name}
                      </h3>
                      <span className="text-xs text-slate-500">{time}</span>
                    </div>
                    <p className={`text-sm truncate ${hasUnread ? "text-slate-800" : "text-slate-500"}`}>
                      {lastPrefix}
                      {lastMsg}
                    </p>
                  </div>
                  {hasUnread ? (
                    <div className="ml-2 flex items-center justify-center">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-purple-600" />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
          <div className="px-4 pt-6 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Start a new chat
          </div>
          {createError && (
            <div className="px-4 pb-2 text-xs text-rose-500">{createError}</div>
          )}
          {contactsLoading ? (
            <div className="px-4 py-3 text-sm text-slate-400">Loading contacts...</div>
          ) : contactsError ? (
            <div className="px-4 py-3 text-sm text-slate-400">{contactsError}</div>
          ) : filteredContacts.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No contacts found.</div>
          ) : (
            filteredContacts.map((contact) => {
              const name = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown";
              const initials = getInitials(contact.first_name || "U", contact.last_name || "U");
              return (
                <button
                  key={contact.id}
                  onClick={() => handleStartChat(contact.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-100 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{name}</div>
                    <div className="text-xs text-slate-500 capitalize">{contact.role || "user"}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedChatId && otherParticipant ? (
          <>
            <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                  {getInitials(otherParticipant.first_name, otherParticipant.last_name)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {otherParticipant.first_name} {otherParticipant.last_name}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <button className="hover:text-purple-600 transition-colors">
                  <Phone size={20} />
                </button>
                <button className="hover:text-purple-600 transition-colors">
                  <Video size={20} />
                </button>
                <button className="hover:text-purple-600 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.uuid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] ${isMe ? "text-right" : "text-left"}`}>
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                        {isMe ? "You" : `${otherParticipant?.first_name || "Guest"}`}
                      </div>
                      <div
                        className={`rounded-2xl px-5 py-3 shadow-sm ${
                          isMe
                            ? "bg-purple-600 text-white rounded-br-none"
                            : "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 text-right ${
                            isMe ? "text-purple-200" : "text-slate-400"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSend} className="flex gap-2 items-center max-w-4xl mx-auto">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-100 text-slate-900 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-500/20"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            {conversations.length > 0
              ? "Select a conversation to start chatting"
              : "No conversations found. Start a chat from the profile or booking page."}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatView() {
  return (
    <Suspense fallback={<div className="p-8">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
