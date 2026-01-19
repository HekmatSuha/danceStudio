"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Building2,
  Users,
  CalendarClock,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { ClassForm } from "../../../components/dashboard/ClassForm";
import { ClassList } from "../../../components/dashboard/ClassList";
import { type ClassEvent } from "../../../lib/classes";
import { type Booking } from "../../../lib/bookings";
import { fetchTrainers, type Trainer } from "../../../lib/trainers";
import { useOwnerStudiosGuard } from "../../../lib/useOwnerStudiosGuard";
import { useAuthedSWR } from "../../../lib/useAuthedSWR";

export default function OwnerDashboardPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const { studios, loading: studiosLoading } = useOwnerStudiosGuard();
  const studioIds = studios.length ? studios.map((studio) => studio.uuid) : null;
  const studioIdsParam = studioIds ? studioIds.join(",") : null;
  const {
    data: slotsData,
    isLoading: slotsLoading,
    mutate: mutateSlots,
  } = useAuthedSWR<ClassEvent[]>(
    studioIdsParam
      ? `/api/owner/classes?studioIds=${studioIdsParam}&limit=100`
      : null
  );
  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    mutate: mutateBookings,
  } = useAuthedSWR<Booking[]>(
    studioIdsParam
      ? `/api/owner/bookings?studioIds=${studioIdsParam}&select=uuid,status,attended,appointment_slot`
      : null
  );
  const slots = useMemo(() => slotsData || [], [slotsData]);
  const bookings = useMemo(() => bookingsData || [], [bookingsData]);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!studioIds || studioIds.length === 0) {
        if (mounted) {
          setTrainers([]);
          setTrainersLoading(false);
        }
        return;
      }
      setTrainersLoading(true);
      try {
        const data = await fetchTrainers({ studioIds });
        if (!mounted) return;
        setTrainers(data);
      } catch (err) {
        console.warn("Failed to load teachers", err);
      } finally {
        if (mounted) setTrainersLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [studioIdsParam]);

  const handleSuccess = () => {
    setShowForm(false);
    setRefreshTrigger((prev) => prev + 1);
    mutateSlots();
    mutateBookings();
  };

  const highlightedTeachers = useMemo(
    () => trainers.slice(0, 6),
    [trainers]
  );

  const stats = useMemo(() => {
    const upcomingCount = slots.filter((s) => s.startAt > now).length;
    const totalCapacity = slots.reduce((sum, s) => sum + (s.capacity || 0), 0);
    const totalReserved = slots.reduce(
      (sum, s) => sum + (s.reservedCount ?? 0),
      0,
    );
    const occupancy =
      totalCapacity > 0 ? Math.round((totalReserved / totalCapacity) * 100) : 0;
    const revenue = bookings.length * 20; // Mock average price
    return {
      studios: studios.length,
      instructors: "Team access",
      upcoming: upcomingCount,
      occupancy,
      bookings: bookings.length,
      revenue: `$${revenue.toLocaleString()}`,
    };
  }, [slots, studios, bookings, now]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(120,85,255,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_28%)]" />

        <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] text-purple-600 uppercase">
                Studio Command
              </p>
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                Owner Dashboard
              </h1>
              <p className="text-lg text-slate-600 mt-3 max-w-2xl">
                Keep your studios, instructors, and classes in sync with a single command center.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-white font-semibold shadow-lg shadow-purple-500/20 hover:translate-y-[-1px] transition-all"
                >
                  <Plus size={18} />
                  Create Class / Event
                </button>
              )}
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 hover:border-slate-300 shadow-sm">
                <ShieldCheck size={18} />
                Manage Access
              </button>
            </div>
          </header>

          <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                icon: <Building2 size={20} />,
                label: "Studios",
                value: `${stats.studios} active`,
                tone: "from-blue-500/10 to-sky-500/5",
              },
              {
                icon: <Users size={20} />,
                label: "Bookings",
                value: `${stats.bookings} total`,
                tone: "from-emerald-500/10 to-lime-500/5",
              },
              {
                icon: <CalendarClock size={20} />,
                label: "Upcoming classes",
                value: `${stats.upcoming} scheduled`,
                tone: "from-purple-500/10 to-indigo-500/5",
              },
              {
                icon: <TrendingUp size={20} />,
                label: "Occupancy",
                value: `${stats.occupancy}% filled`,
                tone: "from-amber-500/10 to-orange-500/5",
              },
              {
                icon: <TrendingUp size={20} />, // Reusing icon for now
                label: "Est. Revenue",
                value: stats.revenue,
                tone: "from-pink-500/10 to-rose-500/5",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
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

          <section className="mt-12 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Master Schedule
                </p>
                <h2 className="text-2xl font-bold text-slate-900">Classes & events</h2>
                <p className="text-sm text-slate-500">
                  See everything across instructors and locations.
                </p>
              </div>
              {!showForm && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-white text-sm font-semibold shadow-md hover:bg-purple-700 transition-colors"
                  >
                    <Plus size={16} />
                    Add to schedule
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300">
                    <CalendarClock size={16} />
                    Export
                  </button>
                </div>
              )}
            </div>

            {showForm && (
              <div className="mb-4 rounded-2xl border border-purple-100 bg-white shadow-sm p-4">
                <ClassForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
              </div>
            )}

            {studioIds && !studiosLoading && !slotsLoading && !bookingsLoading ? (
              <ClassList
                refreshTrigger={refreshTrigger}
                instructorId={null}
                studioIds={studioIds}
              />
              ) : (
                <div className="text-center py-10 text-gray-500">Loading schedule...</div>
              )}
          </section>

          <section className="mt-12 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Teaching Staff
                </p>
                <h2 className="text-2xl font-bold text-slate-900">Teachers</h2>
                <p className="text-sm text-slate-500">
                  Instructors linked to your studios.
                </p>
              </div>
              <Link
                href="/dashboard/owner/instructors"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                View all instructors
              </Link>
            </div>

            {trainersLoading ? (
              <div className="text-center py-8 text-slate-500">Loading teachers...</div>
            ) : highlightedTeachers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500">
                No teachers found yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {highlightedTeachers.map((trainer) => {
                  const first = trainer.first_name || "";
                  const last = trainer.last_name || "";
                  const name = `${first} ${last}`.trim() || "Instructor";
                  const initials = `${first[0] || ""}${last[0] || ""}`.toUpperCase() || "T";
                  const isActive = trainer.is_active ?? true;
                  return (
                    <div
                      key={trainer.uuid}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {trainer.photo ? (
                          <img
                            src={trainer.photo}
                            alt={name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold">
                            {initials}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">
                            {trainer.studio_details?.name || "Instructor"}
                          </p>
                        </div>
                      </div>
                      {trainer.bio ? (
                        <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                          {trainer.bio}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          Instructor
                        </span>
                        {!isActive && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}
