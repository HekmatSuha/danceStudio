"use client";

import React from "react";
import { Inbox, CalendarDays, DoorOpen } from "lucide-react";

export default function InstructorRequestsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Inbox className="text-emerald-600" />
          Requests
        </h1>
        <p className="text-slate-600 mt-2">
          Review booking and studio rental requests from clients and studios.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <CalendarDays size={20} />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Client booking requests</h2>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            New booking requests will appear here once students request your classes.
          </p>
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No pending booking requests.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <DoorOpen size={20} />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Studio rental requests</h2>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Track approvals from studios for your rental requests.
          </p>
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No rental requests yet.
          </div>
        </div>
      </div>
    </div>
  );
}
