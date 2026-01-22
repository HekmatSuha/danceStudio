"use client";

import React, { useState } from "react";
import { Search, Send, MoreVertical, Phone, Video } from "lucide-react";

// Mock data
const CONVERSATIONS = [
  {
    id: 1,
    name: "Alice Johnson",
    lastMessage: "Hi, I have a question about the salsa class.",
    time: "10:30 AM",
    unread: 2,
    avatar: "AJ",
    color: "bg-pink-100 text-pink-600",
  },
  {
    id: 2,
    name: "Bob Smith",
    lastMessage: "Thanks for the information!",
    time: "Yesterday",
    unread: 0,
    avatar: "BS",
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: 3,
    name: "Clara Diaz",
    lastMessage: "Can I reschedule my private lesson?",
    time: "Yesterday",
    unread: 0,
    avatar: "CD",
    color: "bg-purple-100 text-purple-600",
  },
];

const MESSAGES = [
  { id: 1, sender: "Alice Johnson", text: "Hi, I have a question about the salsa class.", time: "10:30 AM", isMe: false },
  { id: 2, sender: "Me", text: "Hello Alice! Sure, what would you like to know?", time: "10:32 AM", isMe: true },
];

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<number | null>(1);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState(MESSAGES);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const newMsg = {
      id: Date.now(),
      sender: "Me",
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };
    
    setMessages([...messages, newMsg]);
    setInputText("");
  };

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
          {CONVERSATIONS.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat.id)}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-slate-100 hover:bg-slate-100 ${
                selectedChat === chat.id ? "bg-white border-l-4 border-l-purple-600 shadow-sm" : "border-l-4 border-l-transparent"
              }`}
            >
              <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm ${chat.color}`}>
                {chat.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-slate-900 truncate">{chat.name}</h3>
                  <span className="text-xs text-slate-500">{chat.time}</span>
                </div>
                <p className={`text-sm truncate ${chat.unread > 0 ? "text-slate-900 font-medium" : "text-slate-500"}`}>
                  {chat.lastMessage}
                </p>
              </div>
              {chat.unread > 0 && (
                <div className="h-5 w-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {chat.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Header */}
            <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm">
                  AJ
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Alice Johnson</h3>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Online
                  </p>
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
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${
                      msg.isMe
                        ? "bg-purple-600 text-white rounded-br-none"
                        : "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.isMe ? "text-purple-200" : "text-slate-400"}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSend} className="flex gap-2 items-center max-w-4xl mx-auto">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-100 text-slate-900 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-500/20"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
