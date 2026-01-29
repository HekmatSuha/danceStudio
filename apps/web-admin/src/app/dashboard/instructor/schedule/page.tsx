"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  AlertCircle
} from "lucide-react";

import { fetchClasses, markClassLocked, type ClassEvent } from "../../../../lib/classes";
import { useAuthUser } from "../../../../lib/useAuthUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { fetchSlotBookings, markAttendance, type BookingWithUser } from "../../../../lib/bookings";
import {
  Card,
  CardContent,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../components/ui/utils";

export default function InstructorSchedulePage() {
  const { user } = useAuthUser();
  const [slots, setSlots] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [roster, setRoster] = useState<BookingWithUser[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [locking, setLocking] = useState(false);
  
  // Initialize week start to the most recent Monday
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day + 6) % 7; // Monday as start
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  });

  useEffect(() => {
    if (!user?.uuid) return;
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
  }, [user?.uuid, user?.first_name]);

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

  const totalVisibleClasses = useMemo(() => {
    let count = 0;
    classesByDay.forEach((list) => count += list.length);
    return count;
  }, [classesByDay]);

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

  const handleJumpToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    setWeekStart(start);
  };

  const START_HOUR = 6;
  const END_HOUR = 23;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const HOUR_HEIGHT = 80;

  return (
    <div className="min-h-screen bg-slate-50/30 p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
           <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <CalendarIcon size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Instructor Schedule</span>
           </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            My Schedule
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Manage your weekly classes and track student attendance.
          </p>
        </div>

        {/* Navigation Toolbar */}
        <div className="flex items-center bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    const prev = new Date(weekStart);
                    prev.setDate(prev.getDate() - 7);
                    setWeekStart(prev);
                }}
                className="hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-4 border-l border-r border-slate-100 h-8 mx-1">
                 <span className="text-sm font-medium text-slate-900 min-w-[140px] text-center">
                    {weekStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                 </span>
            </div>
             <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    const next = new Date(weekStart);
                    next.setDate(next.getDate() + 7);
                    setWeekStart(next);
                }}
                className="hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-2 pl-2 border-l border-slate-100">
                 <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                    onClick={handleJumpToToday}
                >
                    Today
                </Button>
            </div>
        </div>
      </div>

      {!loading && slots.length > 0 && totalVisibleClasses === 0 && (
         <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-amber-100 text-amber-700 rounded-full">
                     <AlertCircle size={18} />
                 </div>
                 <span>You have <span className="font-bold">{slots.length} classes</span> scheduled, but none are in this week view.</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleJumpToToday} className="bg-white border-amber-200 text-amber-800 hover:bg-amber-100">
               Go to Today
            </Button>
         </div>
      )}

      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0 overflow-auto">
           {loading ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <p>Loading your schedule...</p>
              </div>
           ) : (
              <div className="min-w-[900px]">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100">
                      <div className="p-4 text-xs font-medium text-slate-400 border-r border-slate-50 bg-slate-50/50">Time</div>
                      {weekDays.map((day) => {
                          const isToday = new Date().toDateString() === day.toDateString();
                          return (
                              <div key={day.toDateString()} className={cn(
                                  "flex flex-col items-center justify-center py-4 px-2 border-r border-slate-50 last:border-r-0 transition-colors",
                                  isToday ? "bg-emerald-50/50" : ""
                              )}>
                                  <span className={cn(
                                      "text-xs font-semibold uppercase tracking-wider mb-1",
                                      isToday ? "text-emerald-600" : "text-slate-400"
                                  )}>
                                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                                  </span>
                                  <div className={cn(
                                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                                      isToday ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "text-slate-900"
                                  )}>
                                      {day.getDate()}
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Calendar Body */}
                  <div className="relative grid grid-cols-[80px_repeat(7,1fr)] bg-white">
                      {/* Time Column */}
                      <div className="border-r border-slate-50 bg-slate-50/30">
                           {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
                              const hour = i + START_HOUR;
                              return (
                                  <div key={hour} className="relative h-[80px]" style={{ height: `${HOUR_HEIGHT}px` }}>
                                      <span className="absolute -top-3 right-3 text-xs text-slate-400 font-medium">
                                          {hour}:00
                                      </span>
                                  </div>
                              );
                           })}
                      </div>
                      
                      {/* Days Columns */}
                      {weekDays.map((day) => {
                           const dayClasses = classesByDay.get(day.toDateString()) || [];
                           const isToday = new Date().toDateString() === day.toDateString();
                           
                           return (
                               <div 
                                  key={day.toDateString()} 
                                  className={cn(
                                      "relative border-r border-slate-50 last:border-r-0",
                                      isToday ? "bg-emerald-50/10" : ""
                                  )}
                                  style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                               >
                                   {/* Hour lines */}
                                   {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                                       <div key={i} className="absolute w-full border-b border-slate-100" style={{ top: `${(i + 1) * HOUR_HEIGHT}px` }} />
                                   ))}
                                   
                                   {dayClasses.map((slot) => {
                                       const start = new Date(slot.startAt);
                                       const end = new Date(slot.endAt);
                                       const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                                       const duration = (end.getTime() - start.getTime()) / 60000;
                                       
                                       if (startMinutes < -60 || startMinutes > TOTAL_HOURS * 60) return null;

                                       const top = (startMinutes / 60) * HOUR_HEIGHT;
                                       const height = (Math.max(duration, 30) / 60) * HOUR_HEIGHT;

                                       return (
                                           <button
                                               key={slot.id}
                                               onClick={() => handleOpenRoster(slot.id)}
                                               className={cn(
                                                   "group absolute left-1 right-1 rounded-xl p-2 text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:z-10 border-l-4 overflow-hidden",
                                                   slot.isLocked 
                                                      ? "bg-slate-100 border-slate-400 text-slate-500" 
                                                      : "bg-white border-emerald-500 text-slate-900 shadow-md shadow-slate-200/50 ring-1 ring-slate-100"
                                               )}
                                               style={{
                                                   top: `${top}px`,
                                                   height: `${height}px`
                                               }}
                                           >
                                               <div className="flex flex-col h-full justify-between">
                                                   <div>
                                                       <div className="text-xs font-bold leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
                                                          {slot.title}
                                                       </div>
                                                       <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-medium">
                                                           <Clock3 size={10} />
                                                           {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                       </div>
                                                   </div>
                                                   
                                                   {height > 50 && (
                                                       <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate mt-1">
                                                           <MapPin size={10} />
                                                           <span className="truncate">{slot.locationName}</span>
                                                       </div>
                                                   )}
                                               </div>
                                           </button>
                                       );
                                   })}
                               </div>
                           );
                      })}
                  </div>
              </div>
           )}
        </CardContent>
      </Card>

      {/* Roster Dialog */}
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
            <DialogTitle className="flex items-center gap-3 text-xl">
                 <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CheckCircle2 size={20} />
                 </div>
                 {selectedClass?.title}
            </DialogTitle>
            <DialogDescription>
              Manage attendance and view student details for this session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex flex-col">
                 <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Status</span>
                 <div className="font-semibold text-slate-900 flex items-center gap-2 mt-1">
                    {selectedClass?.isLocked ? (
                        <>
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Locked
                        </>
                    ) : (
                        <>
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Open for Attendance
                        </>
                    )}
                 </div>
              </div>
              {!selectedClass?.isLocked && (
                <Button
                  onClick={handleLockClass}
                  disabled={locking}
                  className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20"
                >
                  {locking ? "Locking..." : "Finalize Class"}
                </Button>
              )}
            </div>

            {loadingRoster ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                  <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-emerald-600 rounded-full" />
                  <p>Loading roster...</p>
              </div>
            ) : roster.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p>No bookings yet for this class.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-4 text-left font-semibold text-slate-900">Student</th>
                      <th className="px-5 py-4 text-left font-semibold text-slate-900">Email</th>
                      <th className="px-5 py-4 text-right font-semibold text-slate-900">Status</th>
                      <th className="px-5 py-4 text-right font-semibold text-slate-900">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {roster.map((booking) => (
                      <tr key={booking.uuid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {booking.user?.first_name} {booking.user?.last_name}
                        </td>
                        <td className="px-5 py-4">{booking.user?.email || "-"}</td>
                        <td className="px-5 py-4 text-right">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize",
                            booking.status === "cancelled" 
                                ? "bg-red-50 text-red-700" 
                                : "bg-emerald-50 text-emerald-700"
                          )}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            className={cn(
                                "h-8 w-8 rounded-lg border flex items-center justify-center transition-all ml-auto shadow-sm",
                                booking.attended 
                                    ? "border-emerald-500 bg-emerald-500 text-white shadow-emerald-200" 
                                    : "border-slate-200 bg-white hover:border-emerald-400 text-slate-300 hover:text-emerald-400"
                            )}
                            onClick={() => handleToggleAttendance(booking)}
                            disabled={selectedClass?.isLocked || booking.status === "cancelled"}
                          >
                            <CheckCircle2 size={16} />
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
  );
}
