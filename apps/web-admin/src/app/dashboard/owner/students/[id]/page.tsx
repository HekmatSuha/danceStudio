"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  Info,
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
import { useAuthUser } from "../../../../../lib/useAuthUser";
import { useOwnerStudiosGuard } from "../../../../../lib/useOwnerStudiosGuard";
import useSWR from "swr";
const incomeSources = ["Cash", "Card", "Kaspi QR", "Bank transfer"];
const incomeCategories = ["Membership", "Class booking", "Merch", "Other"];

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
  studio_id?: string | null;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price?: number | string | null;
  currency?: string | null;
  max_participants?: number | null;
  trainer?: { first_name?: string | null; last_name?: string | null } | null;
  studio?: { uuid?: string | null; name?: string | null; address?: string | null; city?: string | null } | null;
};

type BookingRow = {
  uuid: string;
  appointment_slot: string;
  status: string;
  attended?: boolean | null;
  booking_date?: string | null;
};

type FinanceEntryRow = {
  id: string;
  entry_type: "income" | "expense";
  amount: number;
  currency: string;
  payment_date: string;
  booking_id?: string | null;
  payment_source?: string | null;
  category?: string | null;
  description?: string | null;
};

export default function OwnerStudentDetailPage() {
  const params = useParams();
  const studentId = typeof params?.id === "string" ? params.id : "";
  const [activeTab, setActiveTab] = useState<TabKey>("classes");
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [slotMap, setSlotMap] = useState<Map<string, SlotRow>>(new Map());
  const [visitsStatus, setVisitsStatus] = useState<Record<string, string>>({});
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null);
  const [paymentStudioId, setPaymentStudioId] = useState<string | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState("KZT");
  const [financeEntries, setFinanceEntries] = useState<FinanceEntryRow[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    date: "",
    amount: "0",
    source: "",
    category: "",
    description: "",
  });
  const [seasonSaving, setSeasonSaving] = useState(false);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [seasonStudioId, setSeasonStudioId] = useState<string | null>(null);
  const [seasonClasses, setSeasonClasses] = useState<Array<{ id: string; title: string }>>([]);
  const [seasonForm, setSeasonForm] = useState({
    subscriptionType: "multiple",
    classId: "",
    issueDate: "",
    cost: "0",
    classCount: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  const { studios } = useOwnerStudiosGuard();
  const { user } = useAuthUser();
  const searchParams = useSearchParams();

  const {
    data: studentPayload,
    isLoading: studentLoading,
  } = useSWR<{ student: StudentProfile | null; bookings: BookingRow[]; slots: SlotRow[] }>(
    studentId ? `owner:student:${studentId}` : null,
    async () => {
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
            studio_id,
            uuid,
            title,
            start_time,
            end_time,
            price,
            currency,
            max_participants,
            trainer:profiles(first_name, last_name),
            studio:studios(uuid, name, address, city)
          `)
          .in("uuid", slotIds);
        if (slotError) throw slotError;
        slots = (slotRows as SlotRow[]) || [];
      }

      return {
        student: (profileData as StudentProfile) || null,
        bookings: (bookingRows as BookingRow[]) || [],
        slots,
      };
    },
  );

  const {
    data: financePayload,
    isLoading: financeLoading,
    error: financeError,
    mutate: mutateFinance,
  } = useSWR<FinanceEntryRow[]>(
    studentId ? `owner:student:finance:${studentId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("finance_entries")
        .select("id, entry_type, amount, currency, payment_date, booking_id, payment_source, category, description")
        .eq("student_id", studentId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return (data as FinanceEntryRow[]) || [];
    },
  );

  const {
    data: seasonPayload,
    isLoading: seasonClassesLoading,
    error: seasonClassesError,
  } = useSWR<Array<{ id: string; title: string }>>(
    seasonStudioId ? `owner:season-classes:${seasonStudioId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("slots")
        .select("uuid, title")
        .eq("studio_id", seasonStudioId)
        .order("start_time", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.uuid,
        title: row.title || "Class",
      }));
    },
  );

  const loading = studentLoading;
  const financeErrorMessage =
    financeError instanceof Error ? financeError.message : financeError ? String(financeError) : null;
  const seasonClassesErrorMessage =
    seasonClassesError instanceof Error
      ? seasonClassesError.message
      : seasonClassesError
        ? String(seasonClassesError)
        : null;

  const handleMessage = () => {
    const phone = (student?.phone_number || "").trim();
    if (!phone) return;
    const normalized = phone.replace(/\D/g, "");
    if (!normalized) return;
    window.location.href = `https://wa.me/${normalized}`;
  };

  useEffect(() => {
    if (!studentPayload) return;
    setStudent(studentPayload.student);
    setBookings(studentPayload.bookings);
    setSlotMap(new Map(studentPayload.slots.map((slot) => [slot.uuid, slot])));
    setVisitsStatus((prev) => {
      const next = { ...prev };
      studentPayload.bookings.forEach((row) => {
        const key = row.uuid;
        if (next[key]) return;
        if (row.attended) {
          next[key] = "Visited";
        } else if (row.status === "cancelled") {
          next[key] = "Missed";
        } else {
          next[key] = "Pending";
        }
      });
      return next;
    });
  }, [studentPayload]);

  useEffect(() => {
    if (financePayload) {
      setFinanceEntries(financePayload);
    }
  }, [financePayload]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "payments") {
      setActiveTab("payments");
    }
  }, [searchParams]);

  useEffect(() => {
    const openPayment = searchParams.get("openPayment") === "1";
    if (!openPayment) return;
    const bookingId = searchParams.get("bookingId");
    const amountParam = searchParams.get("amount");
    const studioIdParam = searchParams.get("studioId");
    const currencyParam = searchParams.get("currency");
    const descriptionParam = searchParams.get("description");

    setActiveTab("payments");
    setShowPaymentForm(true);
    setPaymentBookingId(bookingId);
    setPaymentStudioId(studioIdParam);
    setPaymentCurrency(currencyParam || "KZT");
    setPaymentForm((prev) => ({
      ...prev,
      date: prev.date || new Date().toISOString().slice(0, 10),
      amount: amountParam || prev.amount || "0",
      source: prev.source,
      category: prev.category || "Class booking",
      description: descriptionParam || prev.description,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (seasonStudioId || studios.length !== 1) return;
    setSeasonStudioId(studios[0].uuid);
  }, [seasonStudioId, studios]);

  useEffect(() => {
    if (!seasonStudioId) {
      setSeasonClasses([]);
      return;
    }
    if (seasonPayload) {
      setSeasonClasses(seasonPayload);
    }
  }, [seasonPayload, seasonStudioId]);

  const studentName = `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "Student";
  const incomeTotal = useMemo(() => {
    return financeEntries
      .filter((entry) => entry.entry_type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }, [financeEntries]);
  const expenseTotal = useMemo(() => {
    return financeEntries
      .filter((entry) => entry.entry_type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }, [financeEntries]);
  const totalPaid = useMemo(() => {
    return incomeTotal - expenseTotal;
  }, [incomeTotal, expenseTotal]);

  const paymentsRows = useMemo(() => {
    return financeEntries
      .filter((entry) => entry.entry_type === "income")
      .map((entry, index) => {
      return {
        id: entry.id,
        type: entry.category || "Income",
        sum: `${Number(entry.amount || 0).toLocaleString()} ${entry.currency || "KZT"}`,
        date: entry.payment_date ? new Date(entry.payment_date).toLocaleDateString() : "-",
        description: entry.description || entry.payment_source || "Payment",
        index: index + 1,
      };
    });
  }, [financeEntries]);

  const seasonTickets = useMemo(() => {
    return financeEntries
      .filter((entry) => entry.entry_type === "income" && entry.category === "Membership")
      .map((entry, index) => {
      return {
        id: entry.id,
        title: "Membership",
        remaining: "1/1",
        price: `${Number(entry.amount || 0).toLocaleString()} ${entry.currency || "KZT"}`,
        status: "Active",
        start: entry.payment_date ? new Date(entry.payment_date).toLocaleDateString() : "-",
        end: "-",
        index: index + 1,
      };
    });
  }, [financeEntries]);

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
      const booking = bookings.find((item) => item.uuid === bookingId);
      const slot = booking ? slotMap.get(booking.appointment_slot) : null;
      const studioId = slot?.studio_id || slot?.studio?.uuid || null;
      const amount = Number(slot?.price || 0);
      const currency = slot?.currency || "KZT";

      if (studioId && Number.isFinite(amount) && amount > 0) {
        const { data: existing, error: existingError } = await supabase
          .from("finance_entries")
          .select("id")
          .eq("booking_id", bookingId)
          .eq("entry_type", "expense")
          .maybeSingle();

        if (existingError) throw existingError;

        if (attended && !existing) {
          const { error } = await supabase.from("finance_entries").insert({
            studio_id: studioId,
            student_id: studentId,
            booking_id: bookingId,
            entry_type: "expense",
            amount,
            currency,
            payment_date: slot?.start_time
              ? new Date(slot.start_time).toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10),
            category: "Class usage",
            description: slot?.title ? `Class usage: ${slot.title}` : "Class usage",
          });
          if (error) throw error;
          setFinanceEntries((prev) => [
            {
              id: `entry-${Date.now()}`,
              entry_type: "expense",
              amount,
              currency,
              payment_date: slot?.start_time
                ? new Date(slot.start_time).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10),
              booking_id: bookingId,
              category: "Class usage",
              description: slot?.title ? `Class usage: ${slot.title}` : "Class usage",
            },
            ...prev,
          ]);
          await mutateFinance();
        }

        if (!attended && existing?.id) {
          const { error } = await supabase
            .from("finance_entries")
            .delete()
            .eq("id", existing.id);
          if (error) throw error;
          setFinanceEntries((prev) => prev.filter((entry) => entry.id !== existing.id));
          await mutateFinance();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentForm.date || !paymentForm.amount) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const booking = paymentBookingId
      ? bookings.find((item) => item.uuid === paymentBookingId)
      : null;
    const slotId = booking?.appointment_slot || null;
    const slot = slotId ? slotMap.get(slotId) : null;
    const finalStudioId = paymentStudioId || slot?.studio_id || slot?.studio?.uuid || null;
    if (!finalStudioId) {
      setPaymentError("Studio is required to record payment.");
      return;
    }

    setPaymentSaving(true);
    setPaymentError(null);
    try {
      const payerName = studentName;
      const { error } = await supabase.from("finance_entries").insert({
        studio_id: finalStudioId,
        student_id: studentId,
        entry_type: "income",
        amount,
        currency: paymentCurrency || "KZT",
        payment_date: paymentForm.date,
        payer_name: payerName || null,
        payment_source: paymentForm.source || null,
        category: paymentForm.category || null,
        description: paymentForm.description || null,
        booking_id: paymentBookingId || null,
      });

      if (error) throw error;

      if (paymentBookingId) {
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("uuid", paymentBookingId);
      }

      setShowPaymentForm(false);
      setPaymentForm({ date: "", amount: "0", source: "", category: "", description: "" });
      setPaymentBookingId(null);
      setPaymentStudioId(null);
      setPaymentCurrency("KZT");
      setFinanceEntries((prev) => [
        {
          id: `entry-${Date.now()}`,
          entry_type: "income",
          amount,
          currency: paymentCurrency || "KZT",
          payment_date: paymentForm.date,
          booking_id: paymentBookingId || null,
          payment_source: paymentForm.source || null,
          category: paymentForm.category || null,
          description: paymentForm.description || null,
        },
        ...prev,
      ]);
      await mutateFinance();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save payment.";
      setPaymentError(message);
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleSeasonSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!seasonForm.issueDate || !seasonForm.cost) return;
    const amount = Number(seasonForm.cost);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const fallbackSlotId = bookings[0]?.appointment_slot || null;
    const fallbackSlot = fallbackSlotId ? slotMap.get(fallbackSlotId) : null;
    const fallbackStudioId =
      seasonStudioId || fallbackSlot?.studio_id || fallbackSlot?.studio?.uuid || null;
    if (!fallbackStudioId) {
      setSeasonError("Studio is required to record a subscription.");
      return;
    }

    setSeasonSaving(true);
    setSeasonError(null);
    try {
      const selectedClass = seasonClasses.find((item) => item.id === seasonForm.classId);
      const seasonDescriptionParts = [
        seasonForm.description?.trim(),
        selectedClass?.title ? `Class: ${selectedClass.title}` : "",
        seasonForm.classCount ? `Classes: ${seasonForm.classCount}` : "",
        seasonForm.startDate && seasonForm.endDate
          ? `Period: ${seasonForm.startDate} to ${seasonForm.endDate}`
          : "",
      ].filter(Boolean);

      const { error } = await supabase.from("finance_entries").insert({
        studio_id: fallbackStudioId,
        student_id: studentId,
        entry_type: "income",
        amount,
        currency: "KZT",
        payment_date: seasonForm.issueDate,
        payer_name: studentName || null,
        category: "Membership",
        description: seasonDescriptionParts.join(" | ") || "Season ticket",
      });

      if (error) throw error;

      setSeasonForm({
        subscriptionType: "multiple",
        classId: "",
        issueDate: "",
        cost: "0",
        classCount: "",
        startDate: "",
        endDate: "",
        description: "",
      });
      setSeasonStudioId(null);
      setShowSeasonForm(false);
      setFinanceEntries((prev) => [
        {
          id: `entry-${Date.now()}`,
          entry_type: "income",
          amount,
          currency: "KZT",
          payment_date: seasonForm.issueDate,
          payment_source: null,
          category: "Membership",
          description: seasonDescriptionParts.join(" | ") || "Season ticket",
          booking_id: null,
        },
        ...prev,
      ]);
      await mutateFinance();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save season ticket.";
      setSeasonError(message);
    } finally {
      setSeasonSaving(false);
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
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-[18px] w-[18px] text-emerald-500"
                  fill="currentColor"
                >
                  <path d="M20.52 3.48A11.86 11.86 0 0 0 12 0a12 12 0 0 0-10.4 18l-1.6 6 6.16-1.62A12 12 0 0 0 24 12a11.86 11.86 0 0 0-3.48-8.52ZM12 22a9.9 9.9 0 0 1-5-1.36l-.36-.2-3.66.96.98-3.56-.24-.38A9.9 9.9 0 1 1 12 22Zm5.52-7.28c-.3-.16-1.76-.86-2.04-.96s-.48-.16-.68.16-.78.96-.96 1.16-.36.22-.66.06a8.1 8.1 0 0 1-2.36-1.44 8.88 8.88 0 0 1-1.64-2.04c-.18-.3 0-.46.14-.62.14-.14.3-.36.46-.54a2.1 2.1 0 0 0 .3-.52.55.55 0 0 0 0-.52c-.06-.16-.68-1.64-.94-2.24s-.5-.5-.68-.5h-.6a1.16 1.16 0 0 0-.84.4 3.52 3.52 0 0 0-1.1 2.6 6.1 6.1 0 0 0 1.28 3.2 13.94 13.94 0 0 0 5.4 4.58c2.06.9 2.06.6 2.44.56a4.16 4.16 0 0 0 2.74-1.94 3.4 3.4 0 0 0 .24-1.94c-.1-.16-.28-.24-.58-.4Z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Balance:</span>
              <span className="text-indigo-600 font-semibold border-b border-dashed border-indigo-400 pb-0.5">
                {totalPaid.toLocaleString()} T
              </span>
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
              onClick={() => {
                setSeasonError(null);
                setSeasonForm((prev) => ({
                  ...prev,
                  issueDate: prev.issueDate || new Date().toISOString().slice(0, 10),
                }));
                setShowSeasonForm(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-sm hover:bg-indigo-700"
            >
              <Plus size={18} />
              Get a subscription
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {financeErrorMessage && (
              <div className="px-6 py-4 text-sm text-rose-500">{financeErrorMessage}</div>
            )}
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
              { id: "total-income", label: "Total income", value: `${incomeTotal.toLocaleString()} T` },
              { id: "total-purchases", label: "Total purchases", value: `${incomeTotal.toLocaleString()} T` },
              { id: "returns", label: "Returns", value: "0 T" },
              {
                id: "average-bill",
                label: "Average bill",
                value: paymentsRows.length
                  ? `${Math.round(totalPaid / paymentsRows.length).toLocaleString()} T`
                  : "0 T",
              },
              { id: "purchase-count", label: "Total purchases", value: `${paymentsRows.length}` },
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
              onClick={() => {
                setPaymentBookingId(null);
                const slotId = bookings[0]?.appointment_slot || null;
                const slot = slotId ? slotMap.get(slotId) : null;
                const fallbackStudioId = slot?.studio_id || slot?.studio?.uuid || null;
                setPaymentStudioId(fallbackStudioId);
                setPaymentCurrency("KZT");
                setShowPaymentForm(true);
              }}
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
                  {financeLoading ? (
                    <tr>
                      <td className="px-6 py-6 text-center text-slate-400" colSpan={6}>
                        Loading payments...
                      </td>
                    </tr>
                  ) : paymentsRows.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-center text-slate-400" colSpan={6}>
                        No payments yet.
                      </td>
                    </tr>
                  ) : (
                    paymentsRows.map((payment) => (
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
                    ))
                  )}
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financeLoading ? (
                    <tr>
                      <td className="px-6 py-6 text-center text-slate-400" colSpan={4}>
                        Loading history...
                      </td>
                    </tr>
                  ) : (() => {
                    const items = [
                      ...financeEntries.map((entry) => ({
                        id: entry.id,
                        type: entry.entry_type === "income" ? "Payment" : "Expense",
                        date: entry.payment_date,
                        description: entry.description || entry.category || "Finance entry",
                      })),
                      ...bookings.map((booking) => ({
                        id: booking.uuid,
                        type: "Booking",
                        date: booking.booking_date || "",
                        description:
                          slotMap.get(booking.appointment_slot)?.title || "Class booking",
                      })),
                    ]
                      .filter((item) => item.date)
                      .sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                      );

                    if (items.length === 0) {
                      return (
                        <tr>
                          <td className="px-6 py-6 text-center text-slate-400" colSpan={4}>
                            There are no activities yet.
                          </td>
                        </tr>
                      );
                    }

                    return items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                        <td className="px-6 py-4">{item.type}</td>
                        <td className="px-6 py-4">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">{item.description}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
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
          <form onSubmit={handleSeasonSubmit} className="grid gap-4">
            {seasonError && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                {seasonError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Subscription *
              </label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600"
                value={seasonForm.subscriptionType}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, subscriptionType: event.target.value }))
                }
              >
                <option value="multiple">For multiple classes</option>
                <option value="single">Single class</option>
              </select>
            </div>
            {studios.length > 1 ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
                <label className="text-sm font-medium text-slate-600">
                  Studio *
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600"
                  value={seasonStudioId || ""}
                  onChange={(event) => setSeasonStudioId(event.target.value || null)}
                >
                  <option value="">Select studio</option>
                  {studios.map((studio) => (
                    <option key={studio.uuid} value={studio.uuid}>
                      {studio.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">Class</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600"
                value={seasonForm.classId}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, classId: event.target.value }))
                }
                disabled={seasonClassesLoading || !seasonStudioId}
              >
                <option value="">
                  {seasonClassesLoading ? "Loading classes..." : "Select class"}
                </option>
                {seasonClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Date of issue *
              </label>
              <div className="relative">
                <input
                  type="date"
                  placeholder="Select date"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                  value={seasonForm.issueDate}
                  onChange={(event) =>
                    setSeasonForm((prev) => ({ ...prev, issueDate: event.target.value }))
                  }
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Subscription cost *
              </label>
              <input
                type="number"
                min="0"
                placeholder="10 000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={seasonForm.cost}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, cost: event.target.value }))
                }
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
                value={seasonForm.classCount}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, classCount: event.target.value }))
                }
              />
              <div className="relative">
                <input
                  type="date"
                  placeholder="Subscription start"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                  value={seasonForm.startDate}
                  onChange={(event) =>
                    setSeasonForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <input
                  type="date"
                  placeholder="Subscription expiration"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                  value={seasonForm.endDate}
                  onChange={(event) =>
                    setSeasonForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            {seasonClassesErrorMessage && (
              <div className="text-sm text-rose-500">{seasonClassesErrorMessage}</div>
            )}
            <textarea
              placeholder="Add a comment"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
              value={seasonForm.description}
              onChange={(event) =>
                setSeasonForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={seasonSaving}
                className="rounded-2xl bg-emerald-500 px-8 py-3 text-white font-semibold disabled:opacity-70"
              >
                {seasonSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
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
          <form onSubmit={handlePaymentSubmit} className="grid gap-4">
            {paymentError && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                {paymentError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Date *</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                  value={paymentForm.date}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Sum *</label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Payment source *</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600"
                value={paymentForm.source}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, source: event.target.value }))
                }
              >
                <option value="">Select source</option>
                {incomeSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Income item *</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600"
                value={paymentForm.category}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                <option value="">Select category</option>
                {incomeCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-start">
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
                value={paymentForm.description}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={paymentSaving}
                className="rounded-2xl bg-lime-500 px-8 py-3 text-white font-semibold disabled:opacity-70"
              >
                {paymentSaving ? "Saving..." : "Add"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
