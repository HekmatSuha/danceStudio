"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  ChevronDown,
  MapPin,
  Plus,
  Repeat,
  Users,
} from "lucide-react";
import { fetchClasses, deleteClass, type ClassEvent } from "../../lib/classes";
import { useAuthUser } from "../../lib/useAuthUser";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Switch } from "../ui/switch";

const FILTER_CHIPS = [
  { id: "teacher", label: "Select a teacher" },
  { id: "room", label: "All rooms" },
  { id: "type", label: "Type" },
  { id: "format", label: "Format" },
];

const ACCENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

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
  const [showArchived, setShowArchived] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassEvent | null>(null);

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
          limit: visibleCount,
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

  const effectiveFilter = showArchived ? "all" : filter;

  const filteredClasses = useMemo(() => {
    const now = Date.now();
    if (effectiveFilter === "upcoming") return classes.filter((c) => c.startAt >= now);
    if (effectiveFilter === "past") return classes.filter((c) => c.startAt < now);
    return classes;
  }, [classes, effectiveFilter]);

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

  const scheduleGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        dateKey: string;
        dateLabel: string;
        timeSlots: Map<
          string,
          { timeLabel: string; startAt: number; classes: ClassEvent[] }
        >;
      }
    >();

    displayClasses.forEach((item) => {
      const dateKey = format(new Date(item.startAt), "yyyy-MM-dd");
      const dateLabel = format(new Date(item.startAt), "dd.MM.yyyy, EEEE");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { dateKey, dateLabel, timeSlots: new Map() });
      }
      const group = grouped.get(dateKey);
      if (!group) return;
      const timeLabel = `${format(new Date(item.startAt), "HH:mm")} - ${format(
        new Date(item.endAt),
        "HH:mm",
      )}`;
      if (!group.timeSlots.has(timeLabel)) {
        group.timeSlots.set(timeLabel, {
          timeLabel,
          startAt: item.startAt,
          classes: [],
        });
      }
      const slot = group.timeSlots.get(timeLabel);
      if (slot) {
        slot.classes.push(item);
      }
    });

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      timeSlots: Array.from(group.timeSlots.values()).sort(
        (a, b) => a.startAt - b.startAt
      ),
    }));
  }, [displayClasses]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Schedule</h1>
          <p className="text-sm text-slate-500">
            {sortedClasses.length} classes scheduled
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
          <Plus size={18} />
          Add
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
          >
            {chip.label}
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        ))}
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300">
          List
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Switch
          checked={showArchived}
          onCheckedChange={(value) => setShowArchived(Boolean(value))}
          className="data-[state=checked]:bg-indigo-600"
        />
        Show archived
      </div>

      {sortedClasses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">
            {effectiveFilter === "past"
              ? "No past classes yet."
              : effectiveFilter === "upcoming"
              ? "No upcoming classes scheduled."
              : "No classes scheduled yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {scheduleGroups.map((group) => (
            <div
              key={group.dateKey}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-base font-semibold text-indigo-600 underline">
                  {group.dateLabel}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      Time
                    </button>
                    <button className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-500">
                      Rooms
                    </button>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Prev
                  </button>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Today
                  </button>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Next
                  </button>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {group.timeSlots.map((slot, slotIndex) => (
                  <div
                    key={`${group.dateKey}-${slot.timeLabel}`}
                    className="grid gap-4 py-4 md:grid-cols-[140px_1fr]"
                  >
                    <div className="text-sm font-semibold text-slate-500">
                      {slot.timeLabel}
                    </div>
                    <div className="space-y-3">
                      {slot.classes.map((item, itemIndex) => {
                        const accent =
                          ACCENT_COLORS[
                            (slotIndex + itemIndex) % ACCENT_COLORS.length
                          ];
                        const reserved = item.reservedCount ?? 0;
                        const capacity = item.capacity || 1;
                        const room = item.locationName || "Studio";
                        const teacher = item.teacherName || "Instructor";
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedClass(item)}
                            className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-50 px-4 py-3 text-left transition hover:border-slate-200 hover:bg-slate-100"
                          >
                            <span
                              className="h-10 w-1.5 rounded-full"
                              style={{ backgroundColor: accent }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-slate-900">
                                  {item.title}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {reserved}/{capacity} students
                                </div>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={12} />
                                  {room}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span>With {teacher}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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

      <Sheet open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="border-b border-slate-100 px-6 pb-4">
            <SheetTitle className="text-lg font-semibold text-slate-900">
              Lesson details
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-500">
              Review the class information.
            </SheetDescription>
          </SheetHeader>
          {selectedClass ? (
            <div className="flex flex-col gap-5 px-6 py-4 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs uppercase tracking-wide text-slate-400">Class</span>
                <span className="font-semibold text-slate-900">{selectedClass.title}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs uppercase tracking-wide text-slate-400">Room</span>
                <span className="font-semibold text-slate-900">
                  {selectedClass.locationName || "Studio"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs uppercase tracking-wide text-slate-400">Date</span>
                <span className="font-semibold text-slate-900">
                  {format(new Date(selectedClass.startAt), "EEE, MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs uppercase tracking-wide text-slate-400">Time</span>
                <span className="font-semibold text-slate-900">
                  {format(new Date(selectedClass.startAt), "h:mm a")} -{" "}
                  {format(new Date(selectedClass.endAt), "h:mm a")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs uppercase tracking-wide text-slate-400">Teacher</span>
                <span className="font-semibold text-slate-900">
                  {selectedClass.teacherName || "Instructor"}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Users size={16} />
                  {selectedClass.reservedCount ?? 0}/{selectedClass.capacity} students
                </div>
                {selectedClass.waitlistCount ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedClass.waitlistCount} on the waitlist
                  </p>
                ) : null}
              </div>
              {selectedClass.recurringRule ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Repeat size={14} />
                  Repeats {selectedClass.recurringRule}
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                {onViewRoster ? (
                  <button
                    onClick={() => onViewRoster(selectedClass.id)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View roster
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Calendar size={16} />
                    {selectedClass.currency || "USD"} {selectedClass.price}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(selectedClass.id)}
                  disabled={!!deletingId}
                  className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                >
                  {deletingId === selectedClass.id ? "Deleting..." : "Delete class"}
                </button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
