"use client";

import React, { useEffect, useMemo, useState } from "react";
import { listBookings, type Booking } from "../../../../lib/bookings";
import { fetchClasses, type ClassEvent } from "../../../../lib/classes";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";

export default function OwnerPaymentsPage() {
  const [slots, setSlots] = useState<ClassEvent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsFrom, setPaymentsFrom] = useState("");
  const [paymentsTo, setPaymentsTo] = useState("");
  const { studios, loading: studiosLoading, role } = useOwnerStudiosGuard();
  const studioIds = studios.length ? studios.map((studio) => studio.uuid) : undefined;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!studioIds) {
          setSlots([]);
          setBookings([]);
          return;
        }
        const [slotsRes, bookingsRes] = await Promise.all([
          fetchClasses({ studioIds }),
          listBookings({ studioIds }),
        ]);
        setSlots(slotsRes);
        setBookings(bookingsRes);
      } catch (err) {
        console.warn("Failed to load payments data", err);
      } finally {
        setLoading(false);
      }
    };
    if (!studiosLoading) {
      load();
    }
  }, [studioIds, studiosLoading]);

  if (studiosLoading) {
    return <div className="p-6 text-slate-500">Loading payments...</div>;
  }
  if (role === "owner" && !studioIds) {
    return null;
  }

  const paymentsSummary = useMemo(() => {
    const from = paymentsFrom ? new Date(`${paymentsFrom}T00:00:00`).getTime() : null;
    const to = paymentsTo ? new Date(`${paymentsTo}T23:59:59`).getTime() : null;
    const filteredSlots = slots.filter((slot) => {
      if (from && slot.startAt < from) return false;
      if (to && slot.startAt > to) return false;
      return true;
    });

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

        <div className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
          <header className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Payments
            </p>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900">
              Revenue summary
            </h1>
            <p className="text-sm text-slate-500">
              Revenue totals by class and time range.
            </p>
          </header>

          <section className="mt-8 space-y-4">
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
