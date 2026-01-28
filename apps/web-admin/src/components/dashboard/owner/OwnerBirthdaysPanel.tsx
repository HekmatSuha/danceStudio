"use client";

import React from "react";

type BirthdayItem = { id: string; name: string; date: string };

type OwnerBirthdaysPanelProps = {
  loading: boolean;
  error: string | null;
  items: BirthdayItem[];
};

export function OwnerBirthdaysPanel({
  loading,
  error,
  items,
}: OwnerBirthdaysPanelProps) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Upcoming instructor birthdays
        </h3>
        <span className="text-xs text-slate-400">Next 30 days</span>
      </div>
      {loading ? (
        <div className="text-sm text-slate-400">Loading birthdays...</div>
      ) : error ? (
        <div className="text-sm text-rose-500">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-slate-500">No birthdays coming up.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2 text-sm"
            >
              <span className="font-semibold text-slate-800">{item.name}</span>
              <span className="text-slate-500">{item.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
