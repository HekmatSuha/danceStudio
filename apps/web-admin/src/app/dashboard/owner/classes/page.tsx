"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ClassForm } from "../../../../components/dashboard/ClassForm";
import { fetchSlotBookings, markAttendance, type BookingWithUser } from "../../../../lib/bookings";
import { ClassTable } from "../../../../components/dashboard/ClassTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Switch } from "../../../../components/ui/switch";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";
import { useRouter } from "next/navigation";
import useSWR from "swr";

export default function OwnerClassesPage() {
  const router = useRouter();
  const { studios, loading: studiosLoading } = useOwnerStudiosGuard();
  const studioIds = studios.length ? studios.map((s) => s.uuid) : undefined;

  const [showForm, setShowForm] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "title">("date_desc");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(true);

  const rosterKey = selectedClassId ? ["bookings", selectedClassId] : null;
  const { data: rosterData, isLoading: loadingRoster, mutate: mutateRoster } = useSWR(
    rosterKey,
    ([, id]) => fetchSlotBookings(id)
  );
  const roster = rosterData || [];

  const handleCreated = () => {
    setShowForm(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleToggleAttendance = async (booking: BookingWithUser) => {
    const next = !(booking.attended ?? false);
    mutateRoster(
      (current) => current?.map(b => b.uuid === booking.uuid ? { ...b, attended: next } : b),
      false
    );
    try {
      await markAttendance(booking.uuid, next);
      mutateRoster();
    } catch (err) {
      alert("Failed to update attendance.");
      mutateRoster();
    }
  };

  if (studiosLoading) {
    return <div className="p-10 text-center text-slate-400">Loading classes...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Classes & Events</h1>
          <p className="text-sm text-slate-500 mt-1">
            View, edit, and manage all classes in one place.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          Add class
        </button>
      </div>

      <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search class, instructor, room..."
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-[170px] bg-slate-50 border-slate-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest first</SelectItem>
              <SelectItem value="date_asc">Oldest first</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={showAll} onCheckedChange={setShowAll} id="show-all-classes" />
          <label htmlFor="show-all-classes" className="text-sm text-slate-600 font-medium">
            Show all classes
          </label>
        </div>
      </section>

      <ClassTable
        refreshTrigger={refreshTrigger}
        filter={filter}
        searchTerm={search}
        sortBy={sortBy}
        pageSize={20}
        studioIds={studioIds}
        fetchAll={showAll}
        instructorId={null}
        onViewRoster={(id) => setSelectedClassId(id)}
        onEdit={(id) => router.push(`/dashboard/owner/classes/${id}?edit=1`)}
      />

      <Dialog open={!!selectedClassId} onOpenChange={(open) => !open && setSelectedClassId(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Class Roster</DialogTitle>
            <DialogDescription>Track attendance for this class.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {loadingRoster ? (
              <div className="text-center py-10 text-slate-400">Loading roster...</div>
            ) : roster.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl">
                No bookings specifically for this slot.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 font-medium text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.map((b) => (
                      <tr key={b.uuid} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {b.user?.first_name} {b.user?.last_name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              b.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleAttendance(b)}
                            className={`px-3 py-1 rounded-md text-xs font-medium ${
                              b.attended ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {b.attended ? "Present" : "Mark Present"}
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>Add a new class to the schedule.</DialogDescription>
          </DialogHeader>
          <ClassForm onSuccess={handleCreated} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
