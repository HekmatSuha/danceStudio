"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

export default function OwnerDashboardPage() {
  const { studios, loading, role } = useOwnerStudiosGuard();
  const [filter, setFilter] = useState("today");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsValues, setStatsValues] = useState({
    income: 0,
    expenses: 0,
    memberships: 0,
    lessons: 0,
    attendees: 0,
  });
  const [revenueRange, setRevenueRange] = useState<"6m" | "12m">("6m");
  const [revenueData, setRevenueData] = useState<Array<{ name: string; revenue: number }>>([]);
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [outstandingError, setOutstandingError] = useState<string | null>(null);
  const [outstandingStudents, setOutstandingStudents] = useState<
    Array<{ id: string; name: string; email?: string | null; phone?: string | null; amount: number }>
  >([]);
  const [birthdayLoading, setBirthdayLoading] = useState(false);
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
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

  useEffect(() => {
    if (loading || studios.length === 0) return;
    const studioIds = studios.map((studio) => studio.uuid);
    const loadStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
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

        setStatsValues({
          income,
          expenses,
          memberships,
          lessons,
          attendees,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load stats.";
        setStatsError(message);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [loading, studios, dateRange]);

  useEffect(() => {
    if (loading || studios.length === 0) return;
    const studioIds = studios.map((studio) => studio.uuid);
    const monthsBack = revenueRange === "12m" ? 12 : 6;
    const endDate = new Date();
    const startDate = startOfMonth(subMonths(endDate, monthsBack - 1));

    const loadRevenue = async () => {
      try {
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

        const chartRows = Array.from(buckets.entries()).map(([key, value]) => ({
          name: format(new Date(`${key}-01`), "MMM"),
          revenue: value,
        }));

        setRevenueData(chartRows);
      } catch (err) {
        console.warn("Failed to load revenue data", err);
        setRevenueData([]);
      }
    };

    loadRevenue();
  }, [loading, studios, revenueRange]);

  useEffect(() => {
    if (loading || studios.length === 0) return;
    const studioIds = studios.map((studio) => studio.uuid);

    const loadOutstanding = async () => {
      setOutstandingLoading(true);
      setOutstandingError(null);
      try {
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
          setOutstandingStudents([]);
          setOutstandingLoading(false);
          return;
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
          setOutstandingStudents([]);
          setOutstandingLoading(false);
          return;
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
          paidByStudent.set(row.student_id, (paidByStudent.get(row.student_id) || 0) + Number(row.amount || 0));
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

        const due = studentIds
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

        setOutstandingStudents(due);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load outstanding students.";
        setOutstandingError(message);
        setOutstandingStudents([]);
      } finally {
        setOutstandingLoading(false);
      }
    };

    loadOutstanding();
  }, [loading, studios]);

  useEffect(() => {
    if (loading || studios.length === 0) return;
    const studioIds = studios.map((studio) => studio.uuid);

    const loadBirthdays = async () => {
      setBirthdayLoading(true);
      setBirthdayError(null);
      try {
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
            const user = (row as { user?: { id?: string; first_name?: string | null; last_name?: string | null; date_of_birth?: string | null } }).user;
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

        setUpcomingBirthdays(rows);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load birthdays.";
        setBirthdayError(message);
        setUpcomingBirthdays([]);
      } finally {
        setBirthdayLoading(false);
      }
    };

    loadBirthdays();
  }, [loading, studios]);

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
        <div className="text-sm text-rose-500">{statsError}</div>
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
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#64748b", fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#64748b", fontSize: 12 }} 
                  tickFormatter={(value) => `₸${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                  formatter={(value: number) => [`₸${value}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Upcoming instructor birthdays</h3>
              <span className="text-xs text-slate-400">Next 30 days</span>
            </div>
            {birthdayLoading ? (
              <div className="text-sm text-slate-400">Loading birthdays...</div>
            ) : birthdayError ? (
              <div className="text-sm text-rose-500">{birthdayError}</div>
            ) : upcomingBirthdays.length === 0 ? (
              <div className="text-sm text-slate-500">No birthdays coming up.</div>
            ) : (
              <div className="space-y-2">
                {upcomingBirthdays.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2 text-sm"
                  >
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="text-slate-500">{item.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Outstanding balances - Takes up 1/3 columns */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Outstanding balances</h2>
            <Link
              href="/dashboard/owner/students"
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              View all
            </Link>
          </div>
          {outstandingLoading ? (
            <div className="text-sm text-slate-400">Loading balances...</div>
          ) : outstandingError ? (
            <div className="text-sm text-rose-500">{outstandingError}</div>
          ) : outstandingStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No outstanding balances right now.
            </div>
          ) : (
            <div className="space-y-3">
              {outstandingStudents.map((student) => (
                <Link
                  key={student.id}
                  href={`/dashboard/owner/students/${student.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 hover:border-rose-200 hover:bg-rose-50 transition-all"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{student.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {student.email || student.phone || "No contact"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-rose-600">
                    ₸{student.amount.toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
