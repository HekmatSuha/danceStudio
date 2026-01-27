"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Users } from "lucide-react";
import { useAuthUser } from "../../../../lib/useAuthUser";
import { fetchClasses, type ClassEvent } from "../../../../lib/classes";

export default function InstructorAnalyticsPage() {
  const { user } = useAuthUser();
  const [slots, setSlots] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uuid) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchClasses({ trainer: user.uuid });
        setSlots(data);
      } catch (err) {
        console.warn("Failed to load instructor analytics", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uuid]);

  const analytics = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;

    const last30 = slots.filter((slot) => slot.startAt >= thirtyDaysAgo && slot.startAt <= now);
    const upcomingWeek = slots.filter(
      (slot) => slot.startAt >= now && slot.startAt <= sevenDaysAhead
    );

    const totalSeats = last30.reduce((sum, slot) => sum + (slot.capacity || 0), 0);
    const reservedSeats = last30.reduce((sum, slot) => sum + (slot.reservedCount || 0), 0);
    const attendanceRate = totalSeats ? Math.round((reservedSeats / totalSeats) * 100) : 0;

    const weekMap = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString(undefined, { weekday: "short" });
      weekMap.set(key, 0);
    }
    last30.forEach((slot) => {
      const key = new Date(slot.startAt).toLocaleDateString(undefined, { weekday: "short" });
      if (weekMap.has(key)) {
        weekMap.set(key, (weekMap.get(key) || 0) + 1);
      }
    });

    return {
      last30Count: last30.length,
      upcomingWeekCount: upcomingWeek.length,
      attendanceRate,
      weekSeries: Array.from(weekMap.entries()),
    };
  }, [slots]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <BarChart3 className="text-emerald-600" />
          Activity Analytics
        </h1>
        <p className="text-slate-600 mt-2">
          Track class activity and attendance over time.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Loading analytics...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Classes in last 30 days", value: `${analytics.last30Count}`, icon: <CalendarDays size={18} /> },
              { label: "Upcoming this week", value: `${analytics.upcomingWeekCount}`, icon: <CalendarDays size={18} /> },
              { label: "Booked seat rate", value: `${analytics.attendanceRate}%`, icon: <Users size={18} /> },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="rounded-xl bg-slate-100 p-2">{card.icon}</span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Classes by weekday</h2>
            <p className="mt-1 text-sm text-slate-500">
              Last 30 days snapshot.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {analytics.weekSeries.map(([day, count]) => (
                <div key={day} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{day}</p>
                  <p className="text-lg font-semibold text-slate-900">{count} classes</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
