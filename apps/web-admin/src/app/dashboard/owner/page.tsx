"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Users,
  CreditCard,
  Plus,
  Briefcase,
  ClipboardList,
  Wallet,
  ChevronDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useOwnerStudiosGuard } from "../../../lib/useOwnerStudiosGuard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import {
  addDays,
  addMonths,
  endOfDay,
  format,
  isValid,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "../../../components/ui/utils";
import { supabase } from "../../../lib/supabase";
import useSWR from "swr";

const OwnerRevenueChart = dynamic(
  () =>
    import("../../../components/dashboard/owner/OwnerRevenueChart").then(
      (mod) => mod.OwnerRevenueChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full animate-pulse rounded-xl bg-slate-100" />
    ),
  },
);

const OwnerBirthdaysPanel = dynamic(
  () =>
    import("../../../components/dashboard/owner/OwnerBirthdaysPanel").then(
      (mod) => mod.OwnerBirthdaysPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
        Loading birthdays...
      </div>
    ),
  },
);

const OwnerOutstandingBalances = dynamic(
  () =>
    import("../../../components/dashboard/owner/OwnerOutstandingBalances").then(
      (mod) => mod.OwnerOutstandingBalances,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading balances...
      </div>
    ),
  },
);

export default function OwnerDashboardPage() {
  const { studios, loading, role } = useOwnerStudiosGuard();
  const [filter, setFilter] = useState("today");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  const [statsValues, setStatsValues] = useState({
    income: 0,
    expenses: 0,
    memberships: 0,
    lessons: 0,
    attendees: 0,
  });
  const [revenueRange, setRevenueRange] = useState<"6m" | "12m">("6m");
  const [outstandingStudents, setOutstandingStudents] = useState<
    Array<{ id: string; name: string; email?: string | null; phone?: string | null; amount: number }>
  >([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<
    Array<{ id: string; name: string; date: string }>
  >([]);

  const filterLabel = useMemo(() => {
    switch(filter) {
        case "today": return "Today";
        case "yesterday": return "Yesterday";
        case "week": return "Since start of week";
        case "month": return "Since start of month";
        case "this_month": return "For August"; // Mock month
        case "year": return "Since start of year";
        case "custom": return "For a period";
        default: return filter;
    }
  }, [filter]);

  const stats = useMemo(() => {
    return [
      {
        label: "Income",
        value: statsValues.income.toLocaleString(),
        subtext: "Income",
        icon: <Wallet className="text-blue-500" size={32} />,
        bg: "bg-blue-100",
        text: "text-blue-900",
        iconBg: "bg-blue-200",
      },
      {
        label: "Expenses",
        value: statsValues.expenses.toLocaleString(),
        subtext: "Expenses",
        icon: <CreditCard className="text-orange-500" size={32} />,
        bg: "bg-orange-100",
        text: "text-orange-900",
        iconBg: "bg-orange-200",
      },
      {
        label: "New memberships",
        value: statsValues.memberships.toLocaleString(),
        subtext: "New memberships",
        icon: <Users className="text-green-600" size={32} />,
        bg: "bg-lime-100",
        text: "text-green-900",
        iconBg: "bg-green-200",
      },
      {
        label: "Lessons conducted",
        value: statsValues.lessons.toLocaleString(),
        subtext: "Lessons conducted",
        icon: <Briefcase className="text-purple-500" size={32} />,
        bg: "bg-purple-100",
        text: "text-purple-900",
        iconBg: "bg-purple-200",
      },
      {
        label: "Attending students",
        value: statsValues.attendees.toLocaleString(),
        subtext: "Attending students",
        icon: <ClipboardList className="text-yellow-600" size={32} />,
        bg: "bg-yellow-100",
        text: "text-yellow-900",
        iconBg: "bg-yellow-200",
      },
    ];
  }, [statsValues]);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (filter === "yesterday") {
      const start = startOfDay(subDays(now, 1));
      const end = endOfDay(subDays(now, 1));
      return { start, end };
    }
    if (filter === "week") {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    }
    if (filter === "month") {
      return { start: startOfMonth(now), end: endOfDay(now) };
    }
    if (filter === "year") {
      return { start: startOfYear(now), end: endOfDay(now) };
    }
    if (filter === "custom") {
      const start = date?.from ? startOfDay(date.from) : startOfDay(now);
      const end = date?.to ? endOfDay(date.to) : endOfDay(start);
      return { start, end };
    }
    return { start: startOfDay(now), end: endOfDay(now) };
  }, [filter, date]);

  const studioIdsKey = useMemo(
    () => studios.map((studio) => studio.uuid).join(","),
    [studios],
  );

  const {
    data: statsPayload,
    isLoading: statsLoading,
    error: statsError,
  } = useSWR<{ income: number; expenses: number; memberships: number; lessons: number; attendees: number }>(
    !loading && studioIdsKey ? `owner:stats:${studioIdsKey}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}` : null,
    async () => {
      const studioIds = studioIdsKey.split(",").filter(Boolean);
      if (studioIds.length === 0) {
        return { income: 0, expenses: 0, memberships: 0, lessons: 0, attendees: 0 };
      }

      const startIso = dateRange.start.toISOString();
      const endIso = dateRange.end.toISOString();
      const startDate = format(dateRange.start, "yyyy-MM-dd");
      const endDate = format(dateRange.end, "yyyy-MM-dd");

      const { data: financeRows, error: financeError } = await supabase
        .from("finance_entries")
        .select("entry_type, amount")
        .in("studio_id", studioIds)
        .gte("payment_date", startDate)
        .lte("payment_date", endDate);

      if (financeError) throw financeError;

      const income = (financeRows || [])
        .filter((row) => row.entry_type === "income")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const expenses = (financeRows || [])
        .filter((row) => row.entry_type === "expense")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);

      const { data: slotRows, error: slotError } = await supabase
        .from("slots")
        .select("uuid")
        .in("studio_id", studioIds)
        .gte("start_time", startIso)
        .lte("start_time", endIso);

      if (slotError) throw slotError;
      const slotIds = (slotRows || []).map((row) => row.uuid);
      const lessons = slotIds.length;

      let memberships = 0;
      let attendees = 0;
      if (slotIds.length > 0) {
        const { data: bookingRows, error: bookingError } = await supabase
          .from("bookings")
          .select("status, attended")
          .in("appointment_slot", slotIds)
          .gte("booking_date", startIso)
          .lte("booking_date", endIso);

        if (bookingError) throw bookingError;
        memberships = (bookingRows || []).filter((row) => row.status === "confirmed").length;
        attendees = (bookingRows || []).filter((row) => row.attended).length;
      }

      return {
        income,
        expenses,
        memberships,
        lessons,
        attendees,
      };
    },
  );

  const { data: revenueData = [] } = useSWR<Array<{ name: string; revenue: number }>>(
    !loading && studioIdsKey ? `owner:revenue:${studioIdsKey}:${revenueRange}` : null,
    async () => {
      const studioIds = studioIdsKey.split(",").filter(Boolean);
      if (studioIds.length === 0) return [];

      const monthsBack = revenueRange === "12m" ? 12 : 6;
      const endDate = new Date();
      const startDate = startOfMonth(subMonths(endDate, monthsBack - 1));

      const { data, error } = await supabase
        .from("finance_entries")
        .select("entry_type, amount, payment_date")
        .in("studio_id", studioIds)
        .gte("payment_date", format(startDate, "yyyy-MM-dd"))
        .lte("payment_date", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;

      const buckets = new Map<string, number>();
      for (let i = 0; i < monthsBack; i += 1) {
        const month = addMonths(startDate, i);
        buckets.set(format(month, "yyyy-MM"), 0);
      }

      (data || []).forEach((row) => {
        if (row.entry_type !== "income" || !row.payment_date) return;
        const key = format(new Date(row.payment_date), "yyyy-MM");
        if (!buckets.has(key)) return;
        const nextValue = (buckets.get(key) || 0) + Number(row.amount || 0);
        buckets.set(key, nextValue);
      });

      return Array.from(buckets.entries()).map(([key, value]) => ({
        name: format(new Date(`${key}-01`), "MMM"),
        revenue: value,
      }));
    },
  );

  const {
    data: outstandingPayload,
    isLoading: outstandingLoading,
    error: outstandingError,
  } = useSWR<Array<{ id: string; name: string; email?: string | null; phone?: string | null; amount: number }>>(
    !loading && studioIdsKey ? `owner:outstanding:${studioIdsKey}` : null,
    async () => {
      const studioIds = studioIdsKey.split(",").filter(Boolean);
      if (studioIds.length === 0) return [];

      const { data: slotRows, error: slotError } = await supabase
        .from("slots")
        .select("uuid, price, studio_id")
        .in("studio_id", studioIds);

      if (slotError) throw slotError;

      const slotPrices = new Map<string, number>();
      (slotRows || []).forEach((row) => {
        slotPrices.set(String(row.uuid), Number(row.price || 0));
      });

      const slotIds = Array.from(slotPrices.keys());
      if (slotIds.length === 0) {
        return [];
      }

      const { data: bookingRows, error: bookingError } = await supabase
        .from("bookings")
        .select("user_id, appointment_slot, status, attended")
        .in("appointment_slot", slotIds);

      if (bookingError) throw bookingError;

      const totalsByStudent = new Map<string, number>();
      (bookingRows || []).forEach((booking) => {
        if (!booking.user_id) return;
        const attended = booking.attended === true || booking.status === "confirmed";
        if (!attended) return;
        const price = slotPrices.get(String(booking.appointment_slot)) || 0;
        if (price <= 0) return;
        totalsByStudent.set(booking.user_id, (totalsByStudent.get(booking.user_id) || 0) + price);
      });

      const studentIds = Array.from(totalsByStudent.keys());
      if (studentIds.length === 0) {
        return [];
      }

      const { data: paymentRows, error: paymentError } = await supabase
        .from("finance_entries")
        .select("student_id, amount")
        .in("studio_id", studioIds)
        .in("student_id", studentIds)
        .eq("entry_type", "income");

      if (paymentError) throw paymentError;

      const paidByStudent = new Map<string, number>();
      (paymentRows || []).forEach((row) => {
        if (!row.student_id) return;
        paidByStudent.set(
          row.student_id,
          (paidByStudent.get(row.student_id) || 0) + Number(row.amount || 0),
        );
      });

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone_number")
        .in("id", studentIds);

      if (profileError) throw profileError;

      const profiles = new Map<string, { name: string; email?: string | null; phone?: string | null }>();
      (profileRows || []).forEach((row) => {
        const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Student";
        profiles.set(row.id, { name, email: row.email, phone: row.phone_number });
      });

      return studentIds
        .map((id) => {
          const total = totalsByStudent.get(id) || 0;
          const paid = paidByStudent.get(id) || 0;
          return {
            id,
            amount: total - paid,
            profile: profiles.get(id),
          };
        })
        .filter((row) => row.amount > 0.01)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6)
        .map((row) => ({
          id: row.id,
          name: row.profile?.name || "Student",
          email: row.profile?.email,
          phone: row.profile?.phone,
          amount: row.amount,
        }));
    },
  );

  useEffect(() => {
    if (outstandingPayload) {
      setOutstandingStudents(outstandingPayload);
    }
  }, [outstandingPayload]);

  const {
    data: birthdayPayload,
    isLoading: birthdayLoading,
    error: birthdayError,
  } = useSWR<Array<{ id: string; name: string; date: string }>>(
    !loading && studioIdsKey ? `owner:birthdays:${studioIdsKey}` : null,
    async () => {
      const studioIds = studioIdsKey.split(",").filter(Boolean);
      if (studioIds.length === 0) return [];

      const { data, error } = await supabase
        .from("tenant_staff")
        .select("user:profiles(id, first_name, last_name, date_of_birth)")
        .in("studio_id", studioIds);

      if (error) throw error;

      const today = new Date();
      const year = today.getFullYear();
      const endWindow = addDays(today, 30);
      const rows = (data || [])
        .map((row) => {
          const user = (row as {
            user?: { id?: string; first_name?: string | null; last_name?: string | null; date_of_birth?: string | null };
          }).user;
          if (!user?.date_of_birth) return null;
          const dob = new Date(user.date_of_birth);
          if (!isValid(dob)) return null;
          const next = new Date(year, dob.getMonth(), dob.getDate());
          const nextDate = next < today ? new Date(year + 1, dob.getMonth(), dob.getDate()) : next;
          if (nextDate > endWindow) return null;
          const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Instructor";
          return {
            id: user.id || `${name}-${user.date_of_birth}`,
            name,
            date: format(nextDate, "MMM d"),
            sortDate: nextDate.getTime(),
          };
        })
        .filter((row): row is { id: string; name: string; date: string; sortDate: number } => Boolean(row))
        .sort((a, b) => a.sortDate - b.sortDate)
        .slice(0, 5)
        .map(({ sortDate, ...rest }) => rest);

      return rows;
    },
  );

  useEffect(() => {
    if (statsPayload) {
      setStatsValues(statsPayload);
    }
  }, [statsPayload]);

  useEffect(() => {
    if (birthdayPayload) {
      setUpcomingBirthdays(birthdayPayload);
    }
  }, [birthdayPayload]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading dashboard...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        You don't have any studios connected yet.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/50 p-6 lg:p-10 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 mb-1">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-bold text-slate-900">
                Statistics
              </h1>
              
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-3xl font-bold text-slate-900 hover:text-slate-700 outline-none transition-colors">
                   <span className="capitalize">{filterLabel.toLowerCase()}</span>
                   <ChevronDown size={28} className="text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px] p-2 bg-white rounded-xl shadow-xl border border-slate-100">
                    <DropdownMenuItem 
                        onClick={() => setFilter("today")}
                        className="rounded-lg hover:bg-slate-50 cursor-pointer py-2 px-3 text-slate-600 font-medium focus:bg-slate-50 focus:text-slate-900"
                    >
                        Today
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => setFilter("yesterday")}
                        className="rounded-lg hover:bg-slate-50 cursor-pointer py-2 px-3 text-slate-600 font-medium focus:bg-slate-50 focus:text-slate-900"
                    >
                        Yesterday
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => setFilter("week")}
                        className="rounded-lg hover:bg-slate-50 cursor-pointer py-2 px-3 text-slate-600 font-medium focus:bg-slate-50 focus:text-slate-900"
                    >
                        Since start of week
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => setFilter("month")}
                        className="rounded-lg hover:bg-slate-50 cursor-pointer py-2 px-3 text-slate-600 font-medium focus:bg-slate-50 focus:text-slate-900"
                    >
                        Since start of month
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => setFilter("year")}
                        className="rounded-lg hover:bg-slate-50 cursor-pointer py-2 px-3 text-slate-600 font-medium focus:bg-slate-50 focus:text-slate-900"
                    >
                        Since start of year
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                        onClick={() => setFilter("custom")}
                        className="rounded-lg hover:bg-slate-50 cursor-pointer py-2 px-3 text-slate-600 font-medium focus:bg-slate-50 focus:text-slate-900"
                    >
                        For a period
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {filter === "custom" && (
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            id="date"
                            className={cn(
                                "flex items-center gap-2 justify-start outline-none font-normal px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm text-sm text-slate-700",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon size={16} className="text-slate-400" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "yyyy-MM-dd")} <span className="text-slate-400 mx-1">→</span> {format(date.to, "yyyy-MM-dd")}
                                    </>
                                ) : (
                                    format(date.from, "yyyy-MM-dd")
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white rounded-xl shadow-xl border border-slate-100" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            className="p-3"
                        />
                    </PopoverContent>
                </Popover>
              )}
          </div>
        </div>
        
        {/* Quick Action Button (Primary) */}
        <Link
          href="/dashboard/owner/classes"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          Create New Class
        </Link>
      </header>

      {/* Metrics Grid - Colorful Cards */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-6 rounded-2xl ${stat.bg} shadow-sm transition-all hover:scale-[1.02] cursor-default min-h-[160px] flex flex-col justify-between`}
          >
             <div className="flex justify-between items-start">
               <div className={`p-3 rounded-full bg-white/60 mb-4`}>
                 {stat.icon}
               </div>
             </div>
             
             <div>
                <h2 className={`text-4xl font-black ${stat.text} leading-none`}>
                  {stat.value}
                </h2>
                <p className={`mt-2 font-medium ${stat.text} opacity-80 text-sm`}>
                  {stat.subtext}
                </p>
             </div>
          </div>
        ))}
      </section>
      {statsLoading ? (
        <div className="text-sm text-slate-400">Loading overview stats...</div>
      ) : statsError ? (
        <div className="text-sm text-rose-500">
          {statsError instanceof Error ? statsError.message : "Unable to load stats."}
        </div>
      ) : null}

      {/* New Records Section - Pinkish card from reference */}
      <section className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center gap-6 shadow-sm">
         <div className="h-14 w-14 rounded-full bg-red-200 flex items-center justify-center text-red-500">
            <ClipboardList size={28} />
         </div>
         <div>
            <h2 className="text-3xl font-bold text-slate-900">
                {filter === "today" ? 13 : filter === "yesterday" ? 5 : filter === "week" ? 42 : filter === "custom" ? 9 : 150}
            </h2>
            <p className="text-slate-600 font-medium">New records {filterLabel.toLowerCase()}</p>
         </div>
      </section>

      {/* Main Content Area: Chart + Quick Actions */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Chart Section - Takes up 2/3 columns */}
        <section className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Revenue Trends</h2>
            <select
              className="bg-slate-50 border-none text-sm font-medium text-slate-600 rounded-lg px-3 py-1.5 cursor-pointer outline-none hover:bg-slate-100"
              value={revenueRange}
              onChange={(event) => setRevenueRange(event.target.value as "6m" | "12m")}
            >
              <option value="6m">Last 6 months</option>
              <option value="12m">Last year</option>
            </select>
          </div>
          <OwnerRevenueChart data={revenueData} />
          <OwnerBirthdaysPanel
            loading={birthdayLoading}
            error={birthdayError}
            items={upcomingBirthdays}
          />
        </section>

        <OwnerOutstandingBalances
          loading={outstandingLoading}
          error={outstandingError instanceof Error ? outstandingError.message : null}
          students={outstandingStudents}
        />
      </div>
    </main>
  );
}
