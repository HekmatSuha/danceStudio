"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { fetchClasses, type ClassEvent } from "../../../lib/classes";
import { listStudios, type Studio } from "../../../lib/studios";
import { listBookings, type Booking } from "../../../lib/bookings";

export default function OwnerDashboardPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [slots, setSlots] = useState<ClassEvent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsFrom, setPaymentsFrom] = useState("");
  const [paymentsTo, setPaymentsTo] = useState("");

  const handleSuccess = () => {
    setShowForm(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studiosRes, slotsRes, bookingsRes] = await Promise.all([
          listStudios(),
          fetchClasses(),
          listBookings(),
        ]);
        setStudios(studiosRes);
        setSlots(slotsRes);
        setBookings(bookingsRes);
      } catch (err) {
        console.warn("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshTrigger]);

  const stats = useMemo(() => {
    const now = Date.now();
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
  }, [slots, studios, bookings]);

  const paymentsSummary = useMemo(() => {
    const from = paymentsFrom ? new Date(`${paymentsFrom}T00:00:00`).getTime() : null;
    const to = paymentsTo ? new Date(`${paymentsTo}T23:59:59`).getTime() : null;
    const filteredSlots = slots.filter((slot) => {
      if (from && slot.startAt < from) return false;
      if (to && slot.startAt > to) return false;
      return true;
    });

    const slotsById = new Map(filteredSlots.map((slot) => [slot.id, slot]));
    const rows = filteredSlots.map((slot) => {
      const slotBookings = bookings.filter((b) => b.appointment_slot === slot.id);
      const cancelled = slotBookings.filter((b) => b.status === "cancelled").length;
      const confirmed = slotBookings.length - cancelled;
      const price = slot.price || 0;
      const revenue = confirmed * price;
      return {
        id: slot.id,
        title: slot.title,
        date: new Date(slot.startAt).toLocaleDateString(),
        currency: slot.currency || "USD",
        confirmed,
        cancelled,
        revenue,
      };
    });

    const totals = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.currency] = (acc[row.currency] || 0) + row.revenue;
      return acc;
    }, {});

    return { rows, totals };
  }, [slots, bookings, paymentsFrom, paymentsTo]);

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

          <section id="payments" className="mt-12 space-y-4">
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

            <ClassList refreshTrigger={refreshTrigger} instructorId={null} />
          </section>

          <section className="mt-12 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Payments
                </p>
                <h2 className="text-2xl font-bold text-slate-900">Revenue summary</h2>
                <p className="text-sm text-slate-500">
                  Revenue totals by class and time range.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-500">From</label>
                  <input
                    type="date"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={paymentsFrom}
                    onChange={(e) => setPaymentsFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-slate-500">To</label>
                  <input
                    type="date"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={paymentsTo}
                    onChange={(e) => setPaymentsTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white/80 shadow-sm">
              {loading ? (
                <div className="p-6 text-center text-slate-400">Loading payments...</div>
              ) : paymentsSummary.rows.length === 0 ? (
                <div className="p-6 text-center text-slate-400">No classes in this range.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Class</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Date</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-900">Bookings</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-900">Cancelled</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-900">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentsSummary.rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
                          <td className="px-4 py-3">{row.date}</td>
                          <td className="px-4 py-3 text-right">{row.confirmed}</td>
                          <td className="px-4 py-3 text-right">{row.cancelled}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {row.currency} {row.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {Object.keys(paymentsSummary.totals).length > 0 && (
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                {Object.entries(paymentsSummary.totals).map(([currency, amount]) => (
                  <span key={currency} className="px-3 py-1 rounded-full bg-slate-100">
                    Total {currency}: {amount.toLocaleString()}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
