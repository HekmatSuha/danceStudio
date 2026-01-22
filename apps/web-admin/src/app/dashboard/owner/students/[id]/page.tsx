"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  Info,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import { supabase } from "../../../../../lib/supabase";
import { markAttendance } from "../../../../../lib/bookings";
import { getOrCreateConversation } from "../../../../../lib/chat";
import { useAuthUser } from "../../../../../lib/useAuthUser";
import { useRouter } from "next/navigation";

type TabKey = "classes" | "season" | "payments" | "visits" | "history";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "classes", label: "Classes" },
  { key: "season", label: "Season tickets" },
  { key: "payments", label: "Payments" },
  { key: "visits", label: "Visits" },
  { key: "history", label: "History" },
];

type StudentProfile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  gender?: string | null;
  created_at?: string | null;
  avatar_url?: string | null;
};

type SlotRow = {
  uuid: string;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price?: number | string | null;
  max_participants?: number | null;
  trainer?: { first_name?: string | null; last_name?: string | null } | null;
  studio?: { name?: string | null; address?: string | null; city?: string | null } | null;
};

type BookingRow = {
  uuid: string;
  appointment_slot: string;
  status: string;
  attended?: boolean | null;
  booking_date?: string | null;
};

export default function OwnerStudentDetailPage() {
  const params = useParams();
  const studentId = typeof params?.id === "string" ? params.id : "";
  const [activeTab, setActiveTab] = useState<TabKey>("classes");
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [slotMap, setSlotMap] = useState<Map<string, SlotRow>>(new Map());
  const [visitsStatus, setVisitsStatus] = useState<Record<string, string>>({});

  const { user } = useAuthUser();
  const router = useRouter();

  const handleMessage = async () => {
    if (!user || !studentId) return;
    try {
      const conversationId = await getOrCreateConversation(user.uuid, studentId);
      router.push(`/dashboard/owner/chat?id=${conversationId}`);
    } catch (error) {
      console.error("Failed to start chat", error);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone_number, gender, created_at, avatar_url")
          .eq("id", studentId)
          .single();
        if (profileError) throw profileError;

        const { data: bookingRows, error: bookingError } = await supabase
          .from("bookings")
          .select("uuid, appointment_slot, status, attended, booking_date")
          .eq("user_id", studentId)
          .order("booking_date", { ascending: false });
        if (bookingError) throw bookingError;

        const slotIds = (bookingRows || [])
          .map((row) => row.appointment_slot)
          .filter(Boolean);

        let slots: SlotRow[] = [];
        if (slotIds.length > 0) {
          const { data: slotRows, error: slotError } = await supabase
            .from("slots")
            .select(`
              uuid,
              title,
              start_time,
              end_time,
              price,
              max_participants,
              trainer:profiles(first_name, last_name),
              studio:studios(name, address, city)
            `)
            .in("uuid", slotIds);
          if (slotError) throw slotError;
          slots = (slotRows as SlotRow[]) || [];
        }

        if (!active) return;
        setStudent(profileData as StudentProfile);
        setBookings((bookingRows as BookingRow[]) || []);
        setSlotMap(new Map(slots.map((slot) => [slot.uuid, slot])));
        setVisitsStatus(
          (bookingRows as BookingRow[] | undefined)?.reduce((acc, row) => {
            const key = row.uuid;
            if (row.attended) {
              acc[key] = "Visited";
            } else if (row.status === "cancelled") {
              acc[key] = "Missed";
            } else {
              acc[key] = "Pending";
            }
            return acc;
          }, {} as Record<string, string>) || {},
        );
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [studentId]);

  const studentName = `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "Student";
  const totalPaid = useMemo(() => {
    return bookings.reduce((sum, booking) => {
      const slot = slotMap.get(booking.appointment_slot);
      const price = Number(slot?.price || 0);
      if (!Number.isFinite(price)) return sum;
      if (booking.status === "cancelled") return sum;
      return sum + price;
    }, 0);
  }, [bookings, slotMap]);

  const paymentsRows = useMemo(() => {
    return bookings.map((booking, index) => {
      const slot = slotMap.get(booking.appointment_slot);
      const price = Number(slot?.price || 0);
      const date = booking.booking_date
        ? new Date(booking.booking_date).toLocaleDateString()
        : "-";
      return {
        id: booking.uuid,
        type: "Class booking",
        sum: `${price.toLocaleString()} T`,
        date,
        description: slot?.title || "Class booking",
        index: index + 1,
      };
    });
  }, [bookings, slotMap]);

  const seasonTickets = useMemo(() => {
    return bookings.map((booking, index) => {
      const slot = slotMap.get(booking.appointment_slot);
      const start = slot?.start_time ? new Date(slot.start_time).toLocaleDateString() : "-";
      const end = slot?.end_time ? new Date(slot.end_time).toLocaleDateString() : "-";
      return {
        id: booking.uuid,
        title: slot?.title || "Class",
        remaining: "1/1",
        price: `${Number(slot?.price || 0).toLocaleString()}`,
        status: booking.status === "cancelled" ? "Inactive" : "Active",
        start,
        end,
        index: index + 1,
      };
    });
  }, [bookings, slotMap]);

  const visitsRows = useMemo(() => {
    return bookings.map((booking, index) => {
      const slot = slotMap.get(booking.appointment_slot);
      const date = slot?.start_time ? new Date(slot.start_time).toLocaleDateString() : "-";
      return {
        id: booking.uuid,
        title: slot?.title || "Class",
        payment: booking.status === "cancelled" ? "Unpaid" : "Paid",
        date,
        index: index + 1,
      };
    });
  }, [bookings, slotMap]);

  const handleVisitStatusChange = async (bookingId: string, value: string) => {
    setVisitsStatus((prev) => ({ ...prev, [bookingId]: value }));
    const attended = value === "Visited" || value === "Visited (by car)";
    try {
      await markAttendance(bookingId, attended);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center gap-6">
        <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
          <UserRound size={38} className="text-slate-400" />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-xl font-semibold text-slate-900">
              {loading ? "Loading..." : studentName}
            </h1>
            <div className="flex items-center gap-2 text-slate-500">
              <Info size={18} className="text-indigo-500" />
              <button onClick={handleMessage} className="hover:bg-slate-100 p-1 rounded-full transition-colors">
                <MessageCircle size={18} className="text-emerald-500" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Balance:</span>
              <span className="text-indigo-600 font-semibold border-b border-dashed border-indigo-400 pb-0.5">
                {totalPaid.toLocaleString()} T
              </span>
              <button className="text-indigo-500 font-medium hover:underline">
                Reconciliation
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Users size={16} className="text-indigo-500" /> Group classes
            </span>
            <span className="inline-flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" /> Joined{" "}
              {student?.created_at
                ? new Date(student.created_at).toLocaleDateString()
                : "-"}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-400">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`transition-colors ${
              activeTab === tab.key
                ? "text-indigo-600"
                : "hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {activeTab === "classes" ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {seasonTickets[0]?.title || "Class"}
              </h2>
              <p className="text-sm text-slate-400 mt-1">Group classes</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-7xl font-semibold text-slate-900">
                {bookings.length}
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                <Users size={22} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-slate-500">
                <button className="p-2 rounded-lg hover:bg-slate-50">
                  <Settings size={18} />
                </button>
                <button className="p-2 rounded-lg hover:bg-slate-50">
                  <Plus size={18} />
                </button>
              </div>
              <button className="rounded-full bg-orange-400 text-white px-6 py-2 text-sm font-semibold">
                Unpin
              </button>
            </div>
          </div>
          <button className="rounded-2xl border border-dashed border-indigo-200 bg-white/60 text-indigo-400 flex items-center justify-center text-4xl font-light min-h-[320px]">
            +
          </button>
        </section>
      ) : null}

      {activeTab === "season" ? (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name"
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500">
                  <Users size={18} />
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Beginning of the period"
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="End of the period"
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            <button
              onClick={() => setShowSeasonForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-sm hover:bg-indigo-700"
            >
              <Plus size={18} />
              Get a subscription
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Remaining/Duration</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Start of action</th>
                    <th className="px-6 py-4">Completion date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seasonTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="px-6 py-4 text-slate-500">{ticket.index}</td>
                      <td className="px-6 py-4">{ticket.title}</td>
                      <td className="px-6 py-4">{ticket.remaining}</td>
                      <td className="px-6 py-4">{ticket.price}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{ticket.start}</td>
                      <td className="px-6 py-4">{ticket.end}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                            <Users size={16} />
                          </button>
                          <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                            <Info size={16} />
                          </button>
                          <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "payments" ? (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid gap-4 lg:grid-cols-5 text-sm">
            {[
              { id: "total-income", label: "Total income", value: `${totalPaid.toLocaleString()} T` },
              { id: "total-purchases", label: "Total purchases", value: `${totalPaid.toLocaleString()} T` },
              { id: "returns", label: "Returns", value: "0 T" },
              { id: "average-bill", label: "Average bill", value: bookings.length ? `${Math.round(totalPaid / bookings.length).toLocaleString()} T` : "0 T" },
              { id: "purchase-count", label: "Total purchases", value: `${bookings.length}` },
            ].map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-lg font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input
                  type="text"
                  placeholder="Search by description"
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Beginning of the period"
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="End of the period"
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <select className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-600">
                  <option>All types</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-sm hover:bg-indigo-700"
            >
              <Plus size={18} />
              Make a payment
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Sum</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentsRows.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 text-slate-500">{payment.index}</td>
                      <td className="px-6 py-4">{payment.type}</td>
                      <td className="px-6 py-4">{payment.sum}</td>
                      <td className="px-6 py-4">{payment.date}</td>
                      <td className="px-6 py-4">{payment.description}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                            <Info size={16} />
                          </button>
                          <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "visits" ? (
        <section className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input
                type="text"
                placeholder="Search by occupation"
                className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Beginning of the period"
                className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
              <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="End of the period"
                className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
              <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visitsRows.map((visit) => (
                    <tr key={visit.id}>
                      <td className="px-6 py-4 text-slate-500">{visit.index}</td>
                      <td className="px-6 py-4">{visit.title}</td>
                      <td className="px-6 py-4">
                        <select
                          className="border border-slate-200 rounded-full px-3 py-1 text-sm text-emerald-600 bg-emerald-50"
                          value={visitsStatus[visit.id] || "Pending"}
                          onChange={(event) =>
                            handleVisitStatusChange(visit.id, event.target.value)
                          }
                        >
                          <option>Visited</option>
                          <option>Missed</option>
                          <option>I was sick</option>
                          <option>Vacation</option>
                          <option>Visited (by car)</option>
                          <option>One-time lesson</option>
                          <option>Pending</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">{visit.payment}</td>
                      <td className="px-6 py-4">{visit.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="space-y-6">
          <div className="relative max-w-xs">
            <select className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-600">
              <option>All</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
            There are no activities yet
          </div>
        </section>
      ) : null}

      <Dialog open={showSeasonForm} onOpenChange={setShowSeasonForm}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New season ticket</DialogTitle>
            <DialogDescription>
              Fill in the subscription details for this student.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Subscription *
              </label>
              <button className="w-full border border-slate-200 rounded-xl px-4 py-3 text-left text-sm text-slate-600 flex items-center justify-between">
                For multiple classes
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">Class</label>
              <button className="w-full border border-slate-200 rounded-xl px-4 py-3 text-left text-sm text-slate-600 flex items-center justify-between">
                Finance
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Date of issue *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select date"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Subscription cost *
              </label>
              <input
                type="text"
                placeholder="10 000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Write off from balance
              </label>
              <input
                type="text"
                placeholder="10 000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Available on balance
              </label>
              <input
                type="text"
                placeholder="5000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Number of classes"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Subscription start"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Subscription expiration"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            <textarea
              placeholder="Add a comment"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
            />
            <div className="flex justify-center pt-2">
              <button className="rounded-2xl bg-emerald-500 px-8 py-3 text-white font-semibold">
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add income</DialogTitle>
            <DialogDescription>
              Record a new income entry for this student.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Date *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select date"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Sum *</label>
              <input
                type="text"
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Payment source *</label>
              <button className="w-full border border-slate-200 rounded-xl px-4 py-3 text-left text-sm text-slate-600 flex items-center justify-between">
                Cashless transfer
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Income item *</label>
              <button className="w-full border border-slate-200 rounded-xl px-4 py-3 text-left text-sm text-slate-600 flex items-center justify-between">
                Purchasing a season ticket
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-start">
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                placeholder=""
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
              />
            </div>
            <div className="flex justify-center pt-2">
              <button className="rounded-2xl bg-lime-500 px-8 py-3 text-white font-semibold">
                Add
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
