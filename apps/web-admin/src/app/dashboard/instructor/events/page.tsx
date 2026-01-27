"use client";

import React from "react";
import { MapPin, CalendarDays } from "lucide-react";

export default function InstructorEventsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MapPin className="text-emerald-600" />
          City Dance Events
        </h1>
        <p className="text-slate-600 mt-2">
          Track dance events and workshops happening in your city.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-slate-600">
          <span className="rounded-xl bg-slate-100 p-2">
            <CalendarDays size={18} />
          </span>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Event feed
          </p>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Connect a local events source to populate upcoming workshops and performances.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No events available yet.
        </div>
      </div>
    </div>
  );
}
