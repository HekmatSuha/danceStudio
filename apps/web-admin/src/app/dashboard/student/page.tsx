"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Compass, Heart, CalendarDays } from "lucide-react";
import { StudentClassList } from "../../../components/dashboard/StudentClassList";
import { listBookings, type Booking } from "../../../lib/bookings";

import { useAuthUser } from "../../../lib/useAuthUser";

export default function StudentDashboardPage() {
  const { user } = useAuthUser();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    listBookings()
      .then(setBookings)
      .catch((err) => console.warn("Failed to load bookings", err));
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = bookings.filter((b) =>
      b.booking_date ? new Date(b.booking_date).getTime() > now : true,
    );
    return {
      upcoming: upcoming.length,
      saved: 0,
      recommendations: "Curated for you",
    };
  }, [bookings]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.12),transparent_26%)]" />

        <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] text-sky-600 uppercase">
                Welcome back
              </p>
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                Student Dashboard
              </h1>
              <p className="text-lg text-slate-600 mt-3 max-w-2xl">
                Discover new sessions, keep your favorites in sight, and book the classes you love.
              </p>
            </div>

            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 text-white font-semibold shadow-lg shadow-sky-400/20 hover:translate-y-[-1px] transition-all">
                <Compass size={18} />
                Explore classes
              </button>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 hover:border-slate-300 shadow-sm">
                <Heart size={18} />
                Favorites
              </button>
            </div>
          </header>

          <section className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: <CalendarDays size={20} />,
                label: "Upcoming",
                value: `${stats.upcoming} booked`,
                tone: "from-sky-500/10 to-cyan-500/5",
              },
              {
                icon: <Heart size={20} />,
                label: "Saved styles",
                value: stats.saved ? `${stats.saved} saved` : "Add favorites",
                tone: "from-pink-500/10 to-purple-500/5",
              },
              {
                icon: <Compass size={20} />,
                label: "Recommendations",
                value: stats.recommendations,
                tone: "from-indigo-500/10 to-slate-500/5",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.tone}`} />
                <div className="relative flex items-center gap-3">
                  <div className="rounded-xl bg-white text-slate-700 p-2.5 shadow-sm border border-slate-100">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Upcoming</p>
                <h2 className="text-2xl font-bold text-slate-900">Book your next class</h2>
                <p className="text-sm text-slate-500">Spots are limited - grab your seat.</p>
              </div>
            </div>
            <StudentClassList />
          </section>
        </div>
      </div>
    </main>
  );
}
