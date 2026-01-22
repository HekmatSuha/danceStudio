"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  CalendarCheck,
  CreditCard,
  Plus,
  Bell,
  Megaphone,
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
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "../../../components/ui/utils";

// Mock data for the chart
const REVENUE_DATA = [
  { name: "Jan", revenue: 4000 },
  { name: "Feb", revenue: 3000 },
  { name: "Mar", revenue: 5000 },
  { name: "Apr", revenue: 4500 },
  { name: "May", revenue: 6000 },
  { name: "Jun", revenue: 7500 },
];

export default function OwnerDashboardPage() {
  const { studios, loading, role } = useOwnerStudiosGuard();
  const [filter, setFilter] = useState("today");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

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

  // Mock stats based on the reference image design
  const stats = useMemo(() => {
    // Base values for "Today"
    let income = 480811;
    let expenses = 27776;
    let memberships = 12;
    let lessons = 21;
    let attendees = 6;

    // Adjust values based on filter to demonstrate functionality
    if (filter === "yesterday") {
        income = 450200;
        expenses = 25000;
        memberships = 8;
        lessons = 20;
        attendees = 15;
    } else if (filter === "week") {
        income = 2100500;
        expenses = 120000;
        memberships = 45;
        lessons = 98;
        attendees = 230;
    } else if (filter === "month") {
        income = 8500000;
        expenses = 450000;
        memberships = 150;
        lessons = 340;
        attendees = 980;
    } else if (filter === "year") {
        income = 45000000;
        expenses = 2100000;
        memberships = 1200;
        lessons = 4500;
        attendees = 12500;
    } else if (filter === "custom") {
        // Randomize slightly for custom range feel
        income = 3200000;
        expenses = 180000;
        memberships = 85;
        lessons = 150;
        attendees = 420;
    }

    return [
      {
        label: "Income",
        value: income.toLocaleString(),
        subtext: "Income",
        icon: <Wallet className="text-blue-500" size={32} />,
        bg: "bg-blue-100",
        text: "text-blue-900",
        iconBg: "bg-blue-200",
      },
      {
        label: "Expenses",
        value: expenses.toLocaleString(),
        subtext: "Expenses",
        icon: <CreditCard className="text-orange-500" size={32} />,
        bg: "bg-orange-100",
        text: "text-orange-900",
        iconBg: "bg-orange-200",
      },
      {
        label: "New memberships",
        value: memberships.toLocaleString(),
        subtext: "New memberships",
        icon: <Users className="text-green-600" size={32} />,
        bg: "bg-lime-100", // Using lime/green mix for that fresh green look
        text: "text-green-900",
        iconBg: "bg-green-200",
      },
      {
        label: "Lessons conducted",
        value: lessons.toLocaleString(),
        subtext: "Lessons conducted",
        icon: <Briefcase className="text-purple-500" size={32} />,
        bg: "bg-purple-100",
        text: "text-purple-900",
        iconBg: "bg-purple-200",
      },
      {
        label: "Attending students",
        value: attendees.toLocaleString(),
        subtext: "Attending students",
        icon: <ClipboardList className="text-yellow-600" size={32} />,
        bg: "bg-yellow-100",
        text: "text-yellow-900",
        iconBg: "bg-yellow-200",
      },
    ];
  }, [filter]);

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
            <select className="bg-slate-50 border-none text-sm font-medium text-slate-600 rounded-lg px-3 py-1.5 cursor-pointer outline-none hover:bg-slate-100">
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={REVENUE_DATA}
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
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                  formatter={(value: number) => [`$${value}`, "Revenue"]}
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
        </section>

        {/* Quick Actions - Takes up 1/3 columns */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid gap-4">
            <Link
              href="/dashboard/owner/notifications"
              className="group flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center transition-colors group-hover:bg-purple-200">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-purple-700">Send Notification</h3>
                <p className="text-xs text-slate-500">Reach all students instantly</p>
              </div>
            </Link>

            <Link
              href="/dashboard/owner/advertisements"
              className="group flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-pink-200 hover:bg-pink-50 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center transition-colors group-hover:bg-pink-200">
                <Megaphone size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-pink-700">New Advertisement</h3>
                <p className="text-xs text-slate-500">Promote a new event</p>
              </div>
            </Link>

            <Link
              href="/dashboard/owner/students"
              className="group flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center transition-colors group-hover:bg-blue-200">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">Add Student</h3>
                <p className="text-xs text-slate-500">Register a new profile</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
