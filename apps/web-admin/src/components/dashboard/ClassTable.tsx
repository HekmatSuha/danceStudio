"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, Users, Trash2, Repeat, MoreVertical, Eye, Pencil } from "lucide-react";
import { fetchClasses, deleteClass, type ClassEvent } from "../../lib/classes";
import { useAuthUser } from "../../lib/useAuthUser";

type ClassTableProps = {
  refreshTrigger: number;
  filter?: "all" | "upcoming" | "past";
  instructorId?: string | null;
  onViewRoster?: (classId: string) => void;
  onEdit?: (classId: string) => void;
  searchTerm?: string;
  sortBy?: "date_asc" | "date_desc" | "title";
  pageSize?: number;
  studioIds?: string[];
  fetchAll?: boolean;
};

export function ClassTable({
  refreshTrigger,
  filter = "all",
  instructorId,
  onViewRoster,
  onEdit,
  searchTerm,
  sortBy = "date_desc",
  pageSize = 10,
  studioIds,
  fetchAll = false,
}: ClassTableProps) {
  const { user } = useAuthUser();
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setClasses([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchClasses({
          trainer: instructorId === null ? undefined : instructorId || user.uuid,
          studioIds,
          limit: fetchAll ? undefined : visibleCount,
          orderBy: "start_time",
          orderAsc: sortBy === "date_asc",
        });
        setClasses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, refreshTrigger, instructorId, studioIds, visibleCount, sortBy]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, filter, searchTerm, sortBy]);

  const filteredClasses = useMemo(() => {
    const now = Date.now();
    if (filter === "upcoming") return classes.filter((c) => c.startAt >= now);
    if (filter === "past") return classes.filter((c) => c.startAt < now);
    return classes;
  }, [classes, filter]);

  const searchedClasses = useMemo(() => {
    const query = (searchTerm || "").trim().toLowerCase();
    if (!query) return filteredClasses;
    return filteredClasses.filter((c) =>
      c.title?.toLowerCase().includes(query) ||
      c.teacherName?.toLowerCase().includes(query) ||
      c.locationName?.toLowerCase().includes(query)
    );
  }, [filteredClasses, searchTerm]);

  const sortedClasses = useMemo(() => {
    const list = [...searchedClasses];
    if (sortBy === "title") {
      return list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }
    if (sortBy === "date_asc") {
      return list.sort((a, b) => a.startAt - b.startAt);
    }
    return list.sort((a, b) => b.startAt - a.startAt);
  }, [searchedClasses, sortBy]);

  const displayClasses = useMemo(
    () => (fetchAll ? sortedClasses : sortedClasses.slice(0, visibleCount)),
    [sortedClasses, visibleCount, fetchAll]
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    setDeletingId(id);
    try {
      await deleteClass(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete class.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading schedule...</div>;
  }

  if (sortedClasses.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
        <div className="mx-auto h-12 w-12 text-gray-300 mb-3 bg-gray-50 rounded-full flex items-center justify-center">
          <Calendar size={24} />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No classes found</h3>
        <p className="text-gray-500 mt-1">
          {filter === "past"
            ? "No past classes found."
            : filter === "upcoming"
            ? "No upcoming classes scheduled."
            : "Get started by creating a new class."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Time & Date</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Instructor</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Occupancy</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayClasses.map((c) => {
                 const reserved = c.reservedCount ?? 0;
                 const capacity = c.capacity || 1;
                 const percent = Math.min(100, Math.round((reserved / capacity) * 100));
                 const barColor = percent > 90 ? "bg-red-400" : percent > 70 ? "bg-amber-400" : "bg-emerald-400";
                 
                 return (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {format(new Date(c.startAt), "h:mm a")}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(c.startAt), "MMM d, yyyy")}
                        </span>
                        {c.recurringRule && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 mt-1 bg-purple-50 px-1.5 py-0.5 rounded w-fit">
                            <Repeat size={10} /> Recurring
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 text-base">{c.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              c.level === "beginner"
                                ? "bg-green-100 text-green-700"
                                : c.level === "intermediate"
                                ? "bg-yellow-100 text-yellow-700"
                                : c.level === "advanced"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {c.level}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {c.currency || "USD"} {c.price}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                          {c.teacherName?.[0] || "?"}
                        </div>
                        <span className="text-sm text-slate-700">{c.teacherName || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="truncate max-w-[120px]" title={c.locationName}>{c.locationName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700">{reserved}/{capacity}</span>
                          <span className="text-slate-400">{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
                        </div>
                        {c.waitlistCount ? (
                          <p className="text-[10px] text-amber-600 mt-1 font-medium">
                            + {c.waitlistCount} waitlist
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onViewRoster && (
                          <button
                            onClick={() => onViewRoster(c.id)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Roster"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(c.id)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Class"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={!!deletingId}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Class"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {!fetchAll && sortedClasses.length > displayClasses.length && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + pageSize)}
            className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 transition-all"
          >
            Load more classes
          </button>
        </div>
      )}
    </div>
  );
}
