"use client";

import React, { useState } from "react";
import { Send, CheckCircle, AlertCircle, Bell } from "lucide-react";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";
import { createNotification } from "../../../../lib/notifications";

export default function PushNotificationsPage() {
  const { studios, loading, role } = useOwnerStudiosGuard();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studios.length === 0) {
      alert("No studios available.");
      return;
    }
    setSending(true);
    setStatus(null);

    try {
      await createNotification({
        studio_id: studios[0].uuid, // Default to first studio
        title,
        body,
        target_audience: targetAudience,
      });

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

  if (loading) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Bell className="text-purple-600" />
          Push Notifications
        </h1>
        <p className="text-slate-600 mt-2">
          Send announcements and updates directly to your students' mobile
          devices.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8">
          {status === "success" && (
            <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800">
              <CheckCircle size={20} />
              <p className="font-medium">
                Notification sent successfully to{" "}
                {targetAudience === "all" ? "everyone" : targetAudience}.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3 text-red-800">
              <AlertCircle size={20} />
              <p className="font-medium">
                Failed to send notification. Please try again.
              </p>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all bg-slate-50/50"
              >
                <option value="all">All Students</option>
                <option value="active">Active Members Only</option>
                <option value="instructors">Instructors Only</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Choose who will receive this notification.
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
                placeholder="e.g., Holiday Schedule Change"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Message Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here..."
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:text-slate-400 resize-none"
              />
              <p className="mt-2 text-xs text-slate-500 text-right">
                {body.length} characters
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={sending || !title || !body}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-3.5 text-white font-semibold shadow-lg shadow-purple-500/20 hover:bg-purple-700 hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
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
            Tips for effective notifications
          </h4>
          <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
            <li>Keep titles short and catchy (under 40 chars).</li>
            <li>Use emojis to increase engagement 💃.</li>
            <li>Send at times when students are likely to be active.</li>
            <li>Avoid sending too frequently to prevent opt-outs.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
