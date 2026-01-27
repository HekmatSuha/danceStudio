"use client";

import React, { useState } from "react";
import { Send, CheckCircle, AlertCircle, Bell } from "lucide-react";

export default function InstructorNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setStatus(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setStatus("success");
      setTitle("");
      setBody("");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Bell className="text-emerald-600" />
          Push Notifications
        </h1>
        <p className="text-slate-600 mt-2">
          Send updates to your students and class attendees.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-8">
          {status === "success" && (
            <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800">
              <CheckCircle size={20} />
              <p className="font-medium">Notification sent successfully.</p>
            </div>
          )}

          {status === "error" && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3 text-red-800">
              <AlertCircle size={20} />
              <p className="font-medium">Failed to send notification. Please try again.</p>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Target audience
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50"
              >
                <option value="all">All students</option>
                <option value="active">Active students</option>
                <option value="class">Upcoming class attendees</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Choose who will receive this update.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Class reminder, schedule update, announcement"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share the details your students need."
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400 resize-none"
              />
              <p className="mt-2 text-xs text-slate-500 text-right">
                {body.length} characters
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={sending || !title || !body}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send size={18} />
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 px-8 py-6 border-t border-slate-100">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Notification tips
          </h4>
          <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
            <li>Keep titles short and focused.</li>
            <li>Send reminders 24 hours before class.</li>
            <li>Be clear about time or location changes.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
