"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Send, MoreVertical, Phone, Video } from "lucide-react";
import { useAuthUser } from "../../../../lib/useAuthUser";
import { 
  fetchConversations, 
  fetchMessages, 
  sendMessage, 
  type Conversation, 
  type Message 
} from "../../../../lib/chat";
import { supabase } from "../../../../lib/supabase";

export default function ChatPage() {
  const { user } = useAuthUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    
    fetchConversations(user.uuid)
      .then((data) => {
        setConversations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load conversations", JSON.stringify(err, null, 2));
        setLoading(false);
      });
  }, [user]);

  // Realtime subscription for new messages in the selected chat
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
          
          // Also update the conversation list last message
          setConversations((prev) => 
            prev.map(c => 
              c.id === selectedChatId 
                ? { ...c, last_message: newMsg, updated_at: newMsg.created_at }
                : c
            ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId]);

  // Load messages when chat is selected
  useEffect(() => {
    if (!selectedChatId) return;

    setMessages([]); // Clear previous messages while loading
    fetchMessages(selectedChatId)
      .then(setMessages)
      .catch((err) => console.error("Failed to load messages", err));
  }, [selectedChatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
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
    return conv.participants.find((p) => p.user_id !== user.uuid)?.user;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading chats...</div>;
  }

  const selectedConversation = conversations.find(c => c.id === selectedChatId);
  const otherParticipant = selectedConversation ? getOtherParticipant(selectedConversation) : null;

  return (
    <div className="h-[calc(100vh-64px)] flex bg-white overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all outline-none text-sm"
              placeholder="Search conversations..." 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">No conversations yet</div>
          ) : (
            conversations.map((chat) => {
              const other = getOtherParticipant(chat);
              const name = other ? `${other.first_name} ${other.last_name}` : "Unknown User";
              const initials = other ? getInitials(other.first_name, other.last_name) : "?";
              const lastMsg = chat.last_message?.content || "No messages yet";
              const time = chat.last_message ? formatTime(chat.last_message.created_at) : "";
              
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-slate-100 hover:bg-slate-100 ${
                    selectedChatId === chat.id ? "bg-white border-l-4 border-l-purple-600 shadow-sm" : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm bg-purple-100 text-purple-600`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">{name}</h3>
                      <span className="text-xs text-slate-500">{time}</span>
                    </div>
                    <p className={`text-sm truncate text-slate-500`}>
                      {lastMsg}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChatId && otherParticipant ? (
          <>
            {/* Header */}
            <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                  {getInitials(otherParticipant.first_name, otherParticipant.last_name)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{otherParticipant.first_name} {otherParticipant.last_name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <button className="hover:text-purple-600 transition-colors"><Phone size={20} /></button>
                <button className="hover:text-purple-600 transition-colors"><Video size={20} /></button>
                <button className="hover:text-purple-600 transition-colors"><MoreVertical size={20} /></button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.uuid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${
                        isMe
                          ? "bg-purple-600 text-white rounded-br-none"
                          : "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? "text-purple-200" : "text-slate-400"}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
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