"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Flame, CalendarCheck2, Sparkles, Plus } from "lucide-react";
import { ClassForm } from "../../../components/dashboard/ClassForm";
import { fetchClasses, markClassLocked, type ClassEvent } from "../../../lib/classes";
import { useAuthUser } from "../../../lib/useAuthUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { fetchSlotBookings, markAttendance, type BookingWithUser } from "../../../lib/bookings";

export default function InstructorDashboardPage() {
  const { user } = useAuthUser();
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [slots, setSlots] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [roster, setRoster] = useState<BookingWithUser[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [locking, setLocking] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day + 6) % 7; // Monday as start
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const handleSuccess = () => {
    setShowForm(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchClasses({ trainer: user?.uuid });
        setSlots(data);
      } catch (err) {
        console.warn("Failed to load instructor slots", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uuid, refreshTrigger]);

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = slots.filter((s) => s.startAt > now);
    const past = slots.filter((s) => s.startAt <= now);
    const next = upcoming.sort((a, b) => a.startAt - b.startAt)[0];
    const seatsTaken = upcoming.reduce(
      (sum, s) => sum + (s.reservedCount ?? 0),
      0,
    );
    const seatsCapacity = upcoming.reduce(
      (sum, s) => sum + (s.capacity || 0),
      0,
    );
    return {
      nextClass: next
        ? new Date(next.startAt).toLocaleString()
        : "No upcoming",
      booked: `${seatsTaken} / ${seatsCapacity || 1}`,
      weekCount: upcoming.length,
      pastCount: past.length,
      loading,
    };
  }, [slots, loading]);

  const selectedClass = useMemo(() => 
    slots.find(s => s.id === selectedClassId), 
  [slots, selectedClassId]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  }, [weekStart]);

  const classesByDay = useMemo(() => {
    const map = new Map<string, ClassEvent[]>();
    weekDays.forEach((day) => map.set(day.toDateString(), []));
    slots.forEach((slot) => {
      const dayKey = new Date(slot.startAt).toDateString();
      if (map.has(dayKey)) {
        map.get(dayKey)!.push(slot);
      }
    });
    map.forEach((list) => list.sort((a, b) => a.startAt - b.startAt));
    return map;
  }, [slots, weekDays]);

  const handleOpenRoster = async (classId: string) => {
    setSelectedClassId(classId);
    setLoadingRoster(true);
    try {
      const data = await fetchSlotBookings(classId);
      setRoster(data);
    } catch (err) {
      console.error(err);
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleToggleAttendance = async (booking: BookingWithUser) => {
    if (selectedClass?.isLocked) return;
    try {
      await markAttendance(booking.uuid, !(booking.attended ?? false));
      setRoster((prev) =>
        prev.map((item) =>
          item.uuid === booking.uuid
            ? { ...item, attended: !(booking.attended ?? false) }
            : item
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update attendance.");
    }
  };

  const handleLockClass = async () => {
    if (!selectedClass) return;
    if (!confirm("Lock attendance for this class? You will not be able to edit after locking.")) return;
    setLocking(true);
    try {
      await markClassLocked(selectedClass.id, true);
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === selectedClass.id ? { ...slot, isLocked: true } : slot
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to lock class.");
    } finally {
      setLocking(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(52,211,153,0.18),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(99,102,241,0.12),transparent_25%)]" />

        <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] text-emerald-600 uppercase">
                Teaching Hub
              </p>
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                Instructor Dashboard
              </h1>
              <p className="text-lg text-slate-600 mt-3 max-w-2xl">
                Schedule, track, and refine every class with a clear split of what is coming up and what is behind you.
              </p>
            </div>

            {!showForm && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:translate-y-[-1px] transition-all"
                >
                  <Plus size={18} />
                  Schedule New Class
                </button>
                <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 hover:border-slate-300 shadow-sm">
                  <Sparkles size={18} />
                  Templates
                </button>
              </div>
            )}
          </header>

          <section className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: <Clock3 size={20} />,
                label: "Next class",
                value: stats.nextClass,
                tone: "from-emerald-500/10 to-teal-500/5",
              },
              {
                icon: <Flame size={20} />,
                label: "Booked seats",
                value: stats.booked,
                tone: "from-orange-500/10 to-amber-500/5",
              },
              {
                icon: <CalendarCheck2 size={20} />,
                label: "Upcoming sessions",
                value: `${stats.weekCount}`,
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

          {showForm && (
            <div className="mt-8 rounded-2xl border border-emerald-100 bg-white shadow-sm p-4">
              <ClassForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
            </div>
          )}

          <section className="mt-12 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Weekly View</p>
                <h2 className="text-2xl font-bold text-slate-900">Schedule & attendance</h2>
                <p className="text-sm text-slate-500">Click a class to manage attendance.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(weekStart);
                    prev.setDate(prev.getDate() - 7);
                    setWeekStart(prev);
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Prev week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(weekStart);
                    next.setDate(next.getDate() + 7);
                    setWeekStart(next);
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Next week
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 text-slate-400">Loading classes...</div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="grid" style={{ gridTemplateColumns: "80px repeat(7, minmax(150px, 1fr))" }}>
                  <div className="border-b border-slate-100 bg-slate-50 p-2 text-xs text-slate-500">Time</div>
                  {weekDays.map((day) => {
                    const isToday = new Date().toDateString() === day.toDateString();
                    return (
                      <div
                        key={day.toDateString()}
                        className={`border-b border-slate-100 p-2 text-xs font-semibold text-slate-700 ${
                          isToday ? "bg-emerald-50 text-emerald-700" : "bg-slate-50"
                        }`}
                      >
                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                        <span className="block text-xs font-normal">{day.toLocaleDateString()}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid" style={{ gridTemplateColumns: "80px repeat(7, minmax(150px, 1fr))" }}>
                  <div className="relative h-[720px]">
                    {Array.from({ length: 12 }).map((_, hourIndex) => {
                      const hour = hourIndex + 8;
                      return (
                        <div key={hour} className="h-[60px] border-b border-slate-100 p-2 text-xs text-slate-400">
                          {hour.toString().padStart(2, "0")}:00
                        </div>
                      );
                    })}
                  </div>

                  {weekDays.map((day) => {
                    const dayClasses = classesByDay.get(day.toDateString()) || [];
                    return (
                      <div key={day.toDateString()} className="relative h-[720px] border-l border-slate-100">
                        {Array.from({ length: 12 }).map((_, hourIndex) => (
                          <div key={hourIndex} className="h-[60px] border-b border-slate-100" />
                        ))}
                        {dayClasses.map((slot) => {
                          const start = new Date(slot.startAt);
                          const end = new Date(slot.endAt);
                          const minutesFromStart = (start.getHours() - 8) * 60 + start.getMinutes();
                          const duration = Math.max((end.getTime() - start.getTime()) / 60000, 30);
                          if (minutesFromStart < 0 || minutesFromStart > 720) return null;
                          const top = (minutesFromStart / 720) * 720;
                          const height = (duration / 720) * 720;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => handleOpenRoster(slot.id)}
                              className={`absolute left-1 right-1 px-2 py-2 text-left text-xs rounded-lg shadow-sm border ${
                                slot.isLocked
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300"
                              }`}
                              style={{ top, height }}
                            >
                              <div className="font-semibold">{slot.title}</div>
                              <div className="text-[11px]">{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                              <div className="text-[11px] truncate">{slot.locationName}</div>
                              {slot.isLocked && <div className="text-[10px] mt-1">Done</div>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <Dialog
            open={!!selectedClassId}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedClassId(null);
                setRoster([]);
              }
            }}
          >
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Class Roster: {selectedClass?.title}</DialogTitle>
                <DialogDescription>
                  Manage attendance and view student details for this session.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-slate-500">
                    {selectedClass?.isLocked ? "Attendance locked" : "Attendance open"}
                  </div>
                  {!selectedClass?.isLocked && (
                    <button
                      type="button"
                      onClick={handleLockClass}
                      disabled={locking}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-70"
                    >
                      <CheckCircle2 size={14} />
                      {locking ? "Locking..." : "Mark done"}
                    </button>
                  )}
                </div>

                {loadingRoster ? (
                  <div className="py-10 text-center text-slate-400">Loading roster...</div>
                ) : roster.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">No bookings yet.</div>
                ) : (
                  <div className="rounded-lg border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">Student</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">Email</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-900">Status</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-900">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roster.map((booking) => (
                          <tr key={booking.uuid} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {booking.user?.first_name} {booking.user?.last_name}
                            </td>
                            <td className="px-4 py-3">{booking.user?.email || "-"}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                booking.status === "cancelled" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                className={`h-5 w-5 rounded border flex items-center justify-center ${
                                  booking.attended ? "border-emerald-400 bg-emerald-500" : "border-slate-300 bg-white"
                                }`}
                                onClick={() => handleToggleAttendance(booking)}
                                disabled={selectedClass?.isLocked || booking.status === "cancelled"}
                                aria-label={booking.attended ? "Present" : "Not present"}
                                title={booking.attended ? "Present" : "Not present"}
                              >
                                {booking.attended && (
                                  <span className="text-white text-xs leading-none">✓</span>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  );
}
