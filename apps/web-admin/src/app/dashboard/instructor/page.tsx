"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Plus,
  TrendingUp,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";

import { ClassForm } from "../../../components/dashboard/ClassForm";
import { fetchClasses, type ClassEvent } from "../../../lib/classes";
import { useAuthUser } from "../../../lib/useAuthUser";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function InstructorDashboardPage() {
  const { user } = useAuthUser();
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [slots, setSlots] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.first_name || "Instructor"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s a quick overview of your teaching performance.
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
        <Card className="border-none bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100">Next Class</CardTitle>
            <Clock3 className="h-4 w-4 text-emerald-100" />
          </CardHeader>
          <CardContent>
            {stats.loading ? (
                <div className="h-6 w-24 animate-pulse bg-white/20 rounded" />
            ) : stats.nextClass ? (
                <>
                    <div className="text-2xl font-bold truncate">{stats.nextClass.title}</div>
                    <p className="text-xs text-emerald-100 mt-1">
                        {new Date(stats.nextClass.startAt).toLocaleString(undefined, {
                            weekday: 'short', hour: 'numeric', minute: '2-digit'
                        })}
                    </p>
                </>
            ) : (
                <div className="text-sm text-emerald-100">No upcoming classes</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Weekly Bookings</CardTitle>
            <Users className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{stats.bookedRatio}</div>
             <p className="text-xs text-blue-100 mt-1">
                Seats booked / Total capacity
             </p>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-100">Upcoming Sessions</CardTitle>
            <CalendarIcon className="h-4 w-4 text-violet-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekCount}</div>
            <p className="text-xs text-violet-100 mt-1">
              Classes scheduled this week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         {/* Weekly Focus */}
         <Card className="bg-slate-900 text-white border-none shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CheckCircle2 size={24} className="text-emerald-400" />
                        Weekly Focus
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-slate-300">
                        Stay on top of your administrative tasks and keep your students engaged.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/10 space-y-1">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">To Confirm</p>
                            <p className="text-2xl font-bold text-white">{stats.weekCount}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/10 space-y-1">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">New Requests</p>
                            <p className="text-2xl font-bold text-white">-</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Button variant="secondary" className="w-full justify-between group" asChild>
                            <Link href="/dashboard/instructor/requests">
                                <span>Review Pending Requests</span>
                                <TrendingUp className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        </Button>
                        <Button variant="outline" className="w-full bg-transparent border-white/20 text-white hover:bg-white/10" asChild>
                            <Link href="/dashboard/instructor/schedule">
                                Go to My Schedule
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Tip */}
            <Card className="bg-white border-slate-200">
                <CardHeader>
                    <CardTitle className="text-xl">Performance Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <p className="text-slate-600 text-sm">
                      Your class attendance rate is looking good this week. Consider sending a push notification to students of upcoming classes to maximize turnout.
                   </p>
                   <div className="pt-4 border-t border-slate-100">
                      <Button className="w-full" variant="outline" asChild>
                         <Link href="/dashboard/instructor/notifications">
                            Send Announcement
                         </Link>
                      </Button>
                   </div>
                </CardContent>
            </Card>
      </div>
    </div>
  );
}
