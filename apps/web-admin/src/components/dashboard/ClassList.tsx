"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, Users, Trash2, Repeat } from "lucide-react";
import { fetchClasses, deleteClass, type ClassEvent } from "../../lib/classes";
import { useAuthUser } from "../../lib/useAuthUser";

type ClassListProps = {
  refreshTrigger: number;
  filter?: "all" | "upcoming" | "past";
  instructorId?: string | null;
  onViewRoster?: (classId: string) => void;
  searchTerm?: string;
  sortBy?: "date_asc" | "date_desc" | "title";
  pageSize?: number;
  studioIds?: string[];
};

export function ClassList({
  refreshTrigger,
  filter = "all",
  instructorId,
  onViewRoster,
  searchTerm,
  sortBy = "date_desc",
  pageSize = 9,
  studioIds,
}: ClassListProps) {
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
        });
        setClasses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, refreshTrigger, instructorId, studioIds]);

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
    () => sortedClasses.slice(0, visibleCount),
    [sortedClasses, visibleCount]
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
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500">
          {filter === "past"
            ? "No past classes yet."
            : filter === "upcoming"
            ? "No upcoming classes scheduled."
            : "No classes scheduled yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayClasses.map((c) => (
        <div
          key={c.id}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider mb-2 ${
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
              <h4 className="text-lg font-bold text-gray-900 leading-tight">{c.title}</h4>
              {c.teacherName && (
                <p className="text-xs text-gray-500 mt-1">Instructor: {c.teacherName}</p>
              )}
            </div>
            {c.recurringRule && (
              <div
                title={`Repeats ${c.recurringRule}`}
                className="text-purple-600 bg-purple-50 p-1.5 rounded-full"
              >
                <Repeat size={14} />
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <span>{format(new Date(c.startAt), "EEE, MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <span>
                {format(new Date(c.startAt), "h:mm a")} - {format(new Date(c.endAt), "h:mm a")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <span>{c.locationName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <span>
                {c.reservedCount ?? 0}/{c.capacity} booked
                {c.waitlistCount ? ` - ${c.waitlistCount} waitlist` : ""}
              </span>
            </div>
          </div>

          {(() => {
            const reserved = c.reservedCount ?? 0;
            const capacity = c.capacity || 1;
            const percent = Math.min(100, Math.round((reserved / capacity) * 100));
            const barColor =
              percent > 90 ? "bg-red-400" : percent > 70 ? "bg-amber-400" : "bg-emerald-400";
            return (
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
              </div>
            );
          })()}

          <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-auto">
            <span className="font-bold text-gray-900">
              {c.currency || "USD"} {c.price}
            </span>
            <div className="flex gap-2">
              {onViewRoster && (
                <button
                  onClick={() => onViewRoster(c.id)}
                  className="text-indigo-500 hover:text-indigo-700 p-2 rounded-full hover:bg-indigo-50 transition-colors"
                  title="View Roster"
                >
                  <Users size={18} />
                </button>
              )}
              <button
                onClick={() => handleDelete(c.id)}
                disabled={!!deletingId}
                className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Delete Class"
              >
                {deletingId === c.id ? "..." : <Trash2 size={18} />}
              </button>
            </div>
          </div>
        </div>
        ))}
      </div>
      {sortedClasses.length > displayClasses.length && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + pageSize)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
