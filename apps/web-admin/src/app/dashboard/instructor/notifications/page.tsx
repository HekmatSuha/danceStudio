"use client";

import React, { useState, useEffect } from "react";
import { Send, CheckCircle, AlertCircle, Bell, Clock } from "lucide-react";
import { fetchMyStudios, type Studio } from "../../../../lib/studios";
import { createNotification, fetchNotifications, type Notification } from "../../../../lib/notifications";

export default function InstructorNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);

  const [studios, setStudios] = useState<Studio[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    fetchMyStudios()
      .then((data) => {
        setStudios(data);
        if (data.length > 0) {
          setSelectedStudioId(data[0].uuid);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedStudioId) {
      setLoadingNotifications(true);
      fetchNotifications([selectedStudioId])
        .then(setNotifications)
        .catch((err) => console.error(err))
        .finally(() => setLoadingNotifications(false));
    }
  }, [selectedStudioId]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudioId) return;

    setSending(true);
    setStatus(null);

    try {
      const newNotification = await createNotification({
        studio_id: selectedStudioId,
        title,
        body,
        target_audience: audience,
      });

      setNotifications((prev) => [newNotification, ...prev]);
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
    return <div className="p-10 text-center text-slate-500">Loading studios...</div>;
  }

  if (studios.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500">
        You are not associated with any studios.
      </div>
    );
  }

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

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">New Notification</h2>

              {status === "success" && (
                <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800">
                  <CheckCircle size={20} />
                  <p className="font-medium">Sent successfully.</p>
                </div>
              )}

              {status === "error" && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3 text-red-800">
                  <AlertCircle size={20} />
                  <p className="font-medium">Failed to send.</p>
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-4">
                {studios.length > 1 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Studio
                    </label>
                    <select
                      value={selectedStudioId}
                      onChange={(e) => setSelectedStudioId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50"
                    >
                      {studios.map((studio) => (
                        <option key={studio.uuid} value={studio.uuid}>
                          {studio.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title"
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
                    placeholder="Details..."
                    required
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400 resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending || !title || !body || !selectedStudioId}
                    className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
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
          </div>

           <div className="bg-slate-50 px-6 py-5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Notification tips
            </h4>
            <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
              <li>Keep titles short and focused.</li>
              <li>Send reminders 24 hours before class.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Recent Notifications</h2>

          {loadingNotifications ? (
            <div className="text-slate-500 text-sm">Loading history...</div>
          ) : notifications.length === 0 ? (
            <div className="text-slate-500 text-sm italic">No notifications found for this studio.</div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-start gap-4">
                      <div>
                         <h3 className="font-semibold text-slate-900">{notif.title}</h3>
                         <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{notif.body}</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md whitespace-nowrap">
                        {notif.target_audience}
                      </span>
                   </div>
                   <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                      <Clock size={12} />
                      {new Date(notif.created_at).toLocaleString()}
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
