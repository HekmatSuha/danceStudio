"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers, LayoutList, Grip, Users, UserCheck } from "lucide-react";
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay } from "date-fns";
import { ClassForm } from "../../../../components/dashboard/ClassForm";
import { fetchClasses, type ClassEvent } from "../../../../lib/classes";
import { fetchSlotBookings, markAttendance, type BookingWithUser } from "../../../../lib/bookings";
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

export default function OwnerClassesPage() {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allClasses, setAllClasses] = useState<ClassEvent[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Roster State
  const [roster, setRoster] = useState<BookingWithUser[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const { studios, loading: studiosLoading, role } = useOwnerStudiosGuard();
  const studioIds = studios.length ? studios.map((s) => s.uuid) : undefined;

  // Load Classes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetching "upcoming" + "past" roughly by asking for a large limit and valid range logic if supported
        // For now fetching a batch and filtering client-side
        const data = await fetchClasses({
          studioIds,
          limit: 100, // Fetch enough to show some history/future
          orderBy: "start_time",
        });
        setAllClasses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studioIds, refreshTrigger]);

  // Derived Data
  const filteredAndGroupedClasses = useMemo(() => {
    const dayStart = startOfDay(selectedDate).getTime();
    const dayEnd = endOfDay(selectedDate).getTime();

    // 1. Filter by Date & Filters
    const filtered = allClasses.filter((c) => {
      // Date Check
      if (c.startAt < dayStart || c.startAt > dayEnd) return false;

      // Dropdown Filters
      if (teacherFilter !== "all" && c.teacherName !== teacherFilter) return false;
      if (roomFilter !== "all" && c.locationName !== roomFilter) return false;
      // Mock Type/Format checks since they aren't on the type explicitly
      // if (typeFilter !== 'all' && c.type !== typeFilter) return false;

      return true;
    });

    // 2. Sort by time
    filtered.sort((a, b) => a.startAt - b.startAt);

    return filtered;
  }, [allClasses, selectedDate, teacherFilter, roomFilter, typeFilter]);

  // Unique lists for filters
  const teachers = useMemo(() => Array.from(new Set(allClasses.map(c => c.teacherName).filter(Boolean))), [allClasses]);
  const rooms = useMemo(() => Array.from(new Set(allClasses.map(c => c.locationName).filter(Boolean))), [allClasses]);

  // Handlers
  const handleCreated = () => {
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewRoster = async (classId: string) => {
    setSelectedClassId(classId);
    setLoadingRoster(true);
    try {
      const data = await fetchSlotBookings(classId);
      setRoster(data);
    } catch (err) {
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
        alert("Failed to update attendance.");
    }
  };

  const hasClasses = filteredAndGroupedClasses.length > 0;

  if (studiosLoading) return <div className="p-10 text-center text-slate-400">Loading schedule...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      
      {/* Filters Bar */}
      <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
           {/* Teacher Filter */}
           <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All teachers</SelectItem>
                    {teachers.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
                </SelectContent>
           </Select>

           {/* Room Filter */}
           <Select value={roomFilter} onValueChange={setRoomFilter}>
                <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200">
                    <SelectValue placeholder="All rooms" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All rooms</SelectItem>
                    {rooms.map(r => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
                </SelectContent>
           </Select>

           {/* Type Filter (Mocked) */}
           <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="group">Group Class</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                </SelectContent>
           </Select>

           {/* Format Filter (Mocked) */}
           <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All formats</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                </SelectContent>
           </Select>
        </div>

        <div className="flex items-center gap-6 w-full xl:w-auto justify-between xl:justify-end">
            {/* Show Archived Toggle */}
            <div className="flex items-center gap-2">
                <Switch 
                    checked={showArchived}
                    onCheckedChange={setShowArchived}
                    id="archived-mode"
                />
                <label htmlFor="archived-mode" className="text-sm text-slate-600 font-medium cursor-pointer select-none">
                    Show archived
                </label>
            </div>

            <div className="flex items-center gap-3">
                 {/* View Switcher */}
                 <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                    <button 
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <LayoutList size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <Grip size={18} />
                    </button>
                 </div>

                 {/* Add Button */}
                 <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                 >
                    <Plus size={18} />
                    Add
                 </button>
            </div>
        </div>
      </section>

      {/* Schedule Container */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
         {/* Navigation Header */}
         <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-indigo-900 mb-4 sm:mb-0">
                <span className="text-indigo-600">{format(selectedDate, "dd.MM.yyyy")}</span>, {format(selectedDate, "EEEE")}
            </h2>

            <div className="flex items-center gap-3">
                 <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                    <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded bg-slate-100/50">Time</button>
                    <button className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded">Rooms</button>
                 </div>
                 
                 <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
                    >
                        Prev
                    </button>
                    <button 
                         onClick={() => setSelectedDate(new Date())}
                         className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50 shadow-sm transition-all"
                    >
                        Today
                    </button>
                    <button 
                         onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                         className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
                    >
                        Next
                    </button>
                 </div>
            </div>
         </div>

         {/* Classes List */}
         <div className="p-6">
            {!hasClasses ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <CalendarIcon size={48} className="mb-4 text-slate-200" />
                    <p className="font-medium text-lg">No classes scheduled for this day</p>
                    <p className="text-sm">Try changing filters or select another date</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredAndGroupedClasses.map((cls) => {
                        let start = "--:--";
                        let end = "--:--";
                        try {
                            if (cls.startAt) {
                                start = format(new Date(cls.startAt), "HH:mm");
                                const duration = cls.duration || 60;
                                end = format(new Date(cls.startAt + duration * 60000), "HH:mm");
                            }
                        } catch (e) {
                            // Invalid date, fallback to defaults
                        }
                        const reserved = cls.reservedCount || 0;
                        const capacity = cls.capacity || 0;
                        
                        // Alternate colors slightly based on something deterministic
                        const isBlue = cls.title.length % 2 === 0; 
                        const barColor = isBlue ? "bg-blue-500" : "bg-emerald-500";
                        const bgColor = isBlue ? "bg-blue-50" : "bg-emerald-50";

                        return (
                            <div key={cls.id} className="flex flex-col sm:flex-row gap-4 sm:gap-10 group border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                                {/* Time Column */}
                                <div className="w-32 pt-1">
                                    <span className="text-lg font-bold text-slate-700 block">{start} - {end}</span>
                                    <span className="text-xs text-slate-400 font-medium">{cls.duration} min</span>
                                </div>

                                {/* Class Card */}
                                <div 
                                    onClick={() => handleViewRoster(cls.id)}
                                    className="flex-1 cursor-pointer transition-transform hover:scale-[1.01]"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Colored Bar Indicator */}
                                        <div className={`w-1.5 h-12 rounded-full ${barColor}`} />
                                        
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900 text-base">{cls.title}</h3>
                                                <span className="text-slate-400 text-sm font-normal">•</span>
                                                <span className="text-slate-500 text-sm">{cls.locationName}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <span className="font-medium text-slate-700">
                                                    {cls.teacherName || "No instructor"}
                                                </span>
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">
                                                    {reserved}/{capacity} students
                                                </span>
                                                {/* <span className="text-slate-400 text-xs">Preparing for school</span> */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
         </div>
      </section>

      {/* Roster Modal (Reused) */}
      <Dialog open={!!selectedClassId} onOpenChange={(open) => !open && setSelectedClassId(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Class Roster</DialogTitle>
            <DialogDescription>
              Track attendance for this class.
            </DialogDescription>
          </DialogHeader>
            {/* ... Existing Roster content ... */}
            <div className="mt-4">
                 {loadingRoster ? (
                    <div className="text-center py-10 text-slate-400">Loading roster...</div>
                 ) : roster.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl">No bookings specifically for this slot.</div>
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
                              {roster.map(b => (
                                <tr key={b.uuid} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{b.user?.first_name} {b.user?.last_name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {b.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => handleToggleAttendance(b)}
                                            className={`px-3 py-1 rounded-md text-xs font-medium ${b.attended ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
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

      {/* Create Modal (Reused) */}
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
