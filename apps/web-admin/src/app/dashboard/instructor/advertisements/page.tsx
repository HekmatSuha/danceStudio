"use client";

import React, { useState } from "react";
import { Megaphone, Plus } from "lucide-react";

type Advertisement = {
  id: string;
  title: string;
  description: string;
};

export default function InstructorAdvertisementsPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const newAd: Advertisement = {
      id: `${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "Promotion details pending.",
    };
    setAds((prev) => [newAd, ...prev]);
    setTitle("");
    setDescription("");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Megaphone className="text-emerald-600" />
          Advertisements
        </h1>
        <p className="text-slate-600 mt-2">
          Promote your classes or special offers to attract students.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create a new advertisement</h2>
          <form onSubmit={handleAdd} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Hip-hop workshop, beginner series, open class"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share key details, time, and any special offers."
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={16} />
              Publish ad
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Your active ads</h2>
          {ads.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No advertisements yet.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {ads.map((ad) => (
                <div key={ad.id} className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-900">{ad.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{ad.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
