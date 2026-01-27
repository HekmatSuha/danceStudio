"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  Inbox,
  UserCircle,
  Settings,
  DollarSign,
  Bell,
  MessageCircle,
  BarChart3,
  TrendingUp,
  Megaphone,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { ClassForm } from "../../../components/dashboard/ClassForm";
import { fetchClasses, markClassLocked, type ClassEvent } from "../../../lib/classes";
import { useAuthUser } from "../../../lib/useAuthUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { fetchSlotBookings, markAttendance, type BookingWithUser } from "../../../lib/bookings";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../components/ui/utils";

export default function InstructorDashboardPage() {
  const { user } = useAuthUser();
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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

  const handleSuccess = () => {
    setShowForm(false);
    setRefreshTrigger((prev) => prev + 1);
  };

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
  }, [user?.uuid, refreshTrigger]);

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = slots.filter((s) => s.startAt > now);
    const next = upcoming.sort((a, b) => a.startAt - b.startAt)[0];
    const seatsTaken = upcoming.reduce(
      (sum, s) => sum + (s.reservedCount ?? 0),
      0,
    );
    // Rough estimate or actual capacity sum
    const seatsCapacity = upcoming.reduce(
      (sum, s) => sum + (s.capacity || 0),
      0,
    );
    
    return {
      nextClass: next,
      bookedRatio: `${seatsTaken} / ${seatsCapacity || "-"}`,
      weekCount: upcoming.length,
      loading,
    };
  }, [slots, loading]);

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

  const quickLinks = [
    { title: "Rentals", href: "/dashboard/instructor/rentals", icon: Search },
    { title: "Requests", href: "/dashboard/instructor/requests", icon: Inbox },
    { title: "Profile", href: "/profile", icon: UserCircle },
    { title: "Settings", href: "/profile", icon: Settings },
    { title: "Payments", href: "/dashboard/instructor/payments", icon: DollarSign },
    { title: "Notifications", href: "/dashboard/instructor/notifications", icon: Bell },
    { title: "Chat", href: "/dashboard/instructor/chat", icon: MessageCircle },
    { title: "Analytics", href: "/dashboard/instructor/analytics", icon: BarChart3 },
    { title: "Income", href: "/dashboard/instructor/income", icon: TrendingUp },
    { title: "Ads", href: "/dashboard/instructor/advertisements", icon: Megaphone },
    { title: "Events", href: "/dashboard/instructor/events", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.first_name || "Instructor"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your classes this week.
          </p>
        </div>
        <div className="flex items-center gap-2">
           {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Schedule Class
            </Button>
           ) : (
            <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
            </Button>
           )}
        </div>
      </div>

      {showForm && (
        <Card className="border-emerald-100 shadow-md">
            <CardHeader>
                <CardTitle>Schedule a New Class</CardTitle>
            </CardHeader>
            <CardContent>
                <ClassForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
            </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Class</CardTitle>
            <Clock3 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {stats.loading ? (
                <div className="h-6 w-24 animate-pulse bg-slate-100 rounded" />
            ) : stats.nextClass ? (
                <>
                    <div className="text-2xl font-bold truncate">{stats.nextClass.title}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {new Date(stats.nextClass.startAt).toLocaleString(undefined, {
                            weekday: 'short', hour: 'numeric', minute: '2-digit'
                        })}
                    </p>
                </>
            ) : (
                <div className="text-sm text-muted-foreground">No upcoming classes</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Bookings</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{stats.bookedRatio}</div>
             <p className="text-xs text-muted-foreground mt-1">
                Seats booked / Total capacity
             </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <CalendarIcon className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Classes scheduled this week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {/* Main Schedule Column */}
        <Card className="lg:col-span-2 xl:col-span-3 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Manage your classes and attendance</CardDescription>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                        const prev = new Date(weekStart);
                        prev.setDate(prev.getDate() - 7);
                        setWeekStart(prev);
                    }}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium px-2 min-w-[100px] text-center">
                    {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                        const next = new Date(weekStart);
                        next.setDate(next.getDate() + 7);
                        setWeekStart(next);
                    }}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
             {loading ? (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                    Loading schedule...
                </div>
             ) : (
                <div className="min-w-[600px] p-4">
                    {/* Header Row */}
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-2 mb-4 text-center">
                        <div className="text-xs text-muted-foreground pt-2">Time</div>
                        {weekDays.map((day) => {
                            const isToday = new Date().toDateString() === day.toDateString();
                            return (
                                <div key={day.toDateString()} className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-lg text-sm",
                                    isToday ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-600"
                                )}>
                                    <span className="text-xs uppercase opacity-70">
                                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                                    </span>
                                    <span>{day.getDate()}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Schedule Grid */}
                    <div className="relative grid grid-cols-[60px_repeat(7,1fr)] gap-2">
                        {/* Time Column */}
                        <div className="space-y-[40px] text-right pr-2 pt-[-10px]">
                             {Array.from({ length: 13 }).map((_, i) => {
                                const hour = i + 8; // Start at 8 AM
                                return (
                                    <div key={hour} className="h-5 text-xs text-muted-foreground relative -top-2.5">
                                        {hour}:00
                                    </div>
                                );
                             })}
                        </div>
                        
                        {/* Days Columns */}
                        {weekDays.map((day) => {
                             const dayClasses = classesByDay.get(day.toDateString()) || [];
                             return (
                                 <div key={day.toDateString()} className="relative h-[720px] bg-slate-50/50 rounded-lg border border-slate-100/50">
                                     {/* Hour lines */}
                                     {Array.from({ length: 12 }).map((_, i) => (
                                         <div key={i} className="absolute w-full border-b border-slate-200/50" style={{ top: `${(i + 1) * 60}px` }} />
                                     ))}
                                     
                                     {dayClasses.map((slot) => {
                                         const start = new Date(slot.startAt);
                                         const end = new Date(slot.endAt);
                                         const startMinutes = (start.getHours() - 8) * 60 + start.getMinutes();
                                         const duration = (end.getTime() - start.getTime()) / 60000;
                                         
                                         // Skip if out of bounds (before 8am or after 8pm) - simplistic check
                                         if (startMinutes < 0) return null;

                                         return (
                                             <button
                                                 key={slot.id}
                                                 onClick={() => handleOpenRoster(slot.id)}
                                                 className={cn(
                                                     "absolute left-0.5 right-0.5 rounded-md border p-1.5 text-left transition-all hover:scale-[1.02] hover:shadow-md",
                                                     slot.isLocked 
                                                        ? "bg-slate-100 border-slate-300 text-slate-500" 
                                                        : "bg-emerald-100 border-emerald-200 text-emerald-900 hover:bg-emerald-200"
                                                 )}
                                                 style={{
                                                     top: `${startMinutes}px`,
                                                     height: `${Math.max(duration, 30)}px`
                                                 }}
                                             >
                                                 <div className="text-xs font-semibold leading-tight truncate">
                                                    {slot.title}
                                                 </div>
                                                 <div className="text-[10px] opacity-80 leading-tight">
                                                    {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
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

        {/* Sidebar Column */}
        <div className="space-y-6 lg:col-span-1">
            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                    {quickLinks.map((link) => (
                        <Link 
                            key={link.title} 
                            href={link.href}
                            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-center"
                        >
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
                                <link.icon size={18} />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{link.title}</span>
                        </Link>
                    ))}
                </CardContent>
            </Card>

            {/* Weekly Focus */}
            <Card className="bg-slate-900 text-white border-none">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        Weekly Focus
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-slate-300">
                        Stay on top of your administrative tasks.
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm p-2 rounded bg-white/10">
                            <span>Classes to confirm</span>
                            <span className="font-bold text-white">{stats.weekCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm p-2 rounded bg-white/10">
                            <span>Pending Requests</span>
                            <span className="font-bold text-white">-</span>
                        </div>
                    </div>
                    <Button variant="secondary" className="w-full text-xs" asChild>
                        <Link href="/dashboard/instructor/requests">
                            View All Requests
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>

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
            <DialogTitle>Class Roster: {selectedClass?.title}</DialogTitle>
            <DialogDescription>
              Manage attendance and view student details for this session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-slate-500">
                {selectedClass?.isLocked ? (
                    <span className="flex items-center gap-2 text-amber-600">
                        <CheckCircle2 size={16} /> Attendance Locked
                    </span>
                ) : (
                    <span className="flex items-center gap-2 text-emerald-600">
                        <Clock3 size={16} /> Attendance Open
                    </span>
                )}
              </div>
              {!selectedClass?.isLocked && (
                <Button
                  size="sm"
                  onClick={handleLockClass}
                  disabled={locking}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {locking ? "Locking..." : "Finalize & Lock"}
                </Button>
              )}
            </div>

            {loadingRoster ? (
              <div className="py-10 text-center text-slate-400">Loading roster...</div>
            ) : roster.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-lg">No bookings yet for this class.</div>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200">
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
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            booking.status === "cancelled" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className={cn(
                                "h-6 w-6 rounded border flex items-center justify-center transition-all ml-auto",
                                booking.attended 
                                    ? "border-emerald-500 bg-emerald-500 text-white" 
                                    : "border-slate-300 bg-white hover:border-emerald-400"
                            )}
                            onClick={() => handleToggleAttendance(booking)}
                            disabled={selectedClass?.isLocked || booking.status === "cancelled"}
                          >
                            {booking.attended && <CheckCircle2 size={14} />}
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