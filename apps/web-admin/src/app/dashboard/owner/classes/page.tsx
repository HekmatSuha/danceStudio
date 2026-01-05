"use client";

import React, { useMemo, useState } from "react";
import { Filter, Plus, Search, UserCheck } from "lucide-react";
import { ClassList } from "../../../../components/dashboard/ClassList";
import { ClassForm } from "../../../../components/dashboard/ClassForm";
import { fetchSlotBookings, markAttendance, type BookingWithUser } from "../../../../lib/bookings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";

export default function OwnerClassesPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [roster, setRoster] = useState<BookingWithUser[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "title">("date_desc");
  const { studios, loading: studiosLoading, role } = useOwnerStudiosGuard();
  const studioIds = studios.length ? studios.map((studio) => studio.uuid) : undefined;

  const handleCreated = () => {
    setShowForm(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleViewRoster = async (classId: string) => {
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
    const next = !(booking.attended ?? false);
    try {
      await markAttendance(booking.uuid, next);
      setRoster((prev) =>
        prev.map((item) => (item.uuid === booking.uuid ? { ...item, attended: next } : item))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update attendance.");
    }
  };

  const summary = useMemo(() => {
    const total = roster.length;
    const cancelled = roster.filter((b) => b.status === "cancelled").length;
    const attended = roster.filter((b) => b.attended).length;
    return { total, cancelled, attended };
  }, [roster]);

  if (studiosLoading) {
    return <div className="p-6 text-slate-500">Loading classes...</div>;
  }
  if (role === "owner" && !studioIds) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">All Classes & Events</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={18} />
            Add Class
          </button>
        )}
      </div>
      {showForm && (
        <div className="mb-8 max-w-3xl">
          <ClassForm onSuccess={handleCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex gap-2">
          {(["all", "upcoming", "past"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                filter === value
                  ? "bg-purple-100 text-purple-700"
                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search classes, instructor, or location..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Soonest first</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      <ClassList
        instructorId={null}
        refreshTrigger={refreshTrigger}
        onViewRoster={handleViewRoster}
        filter={filter}
        searchTerm={search}
        sortBy={sortBy}
        pageSize={9}
        studioIds={studioIds}
      />

      <Dialog open={!!selectedClassId} onOpenChange={(open) => !open && setSelectedClassId(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Class Roster</DialogTitle>
            <DialogDescription>
              Track attendance and cancellations for this class.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 text-sm text-slate-600">
            <span>Total: {summary.total}</span>
            <span>Attended: {summary.attended}</span>
            <span>Cancelled: {summary.cancelled}</span>
          </div>

          {loadingRoster ? (
            <div className="py-10 text-center text-slate-400">Loading roster...</div>
          ) : roster.length === 0 ? (
            <div className="py-10 text-center text-slate-400">No bookings yet.</div>
          ) : (
            <div className="mt-4 rounded-lg border border-slate-100 overflow-hidden">
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
                          onClick={() => handleToggleAttendance(booking)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          disabled={booking.status === "cancelled"}
                          title={booking.status === "cancelled" ? "Cancelled bookings cannot be marked" : "Toggle attendance"}
                        >
                          <UserCheck size={14} />
                          {booking.attended ? "Present" : "Mark present"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
