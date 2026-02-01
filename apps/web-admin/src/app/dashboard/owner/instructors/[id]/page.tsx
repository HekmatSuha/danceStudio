"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Banknote, CalendarCheck, Mail, MapPin, Phone, Save } from "lucide-react";
import useSWR from "swr";
import { fetchClasses, type ClassEvent } from "../../../../../lib/classes";
import { supabase } from "../../../../../lib/supabase";
import { useOwnerStudiosGuard } from "../../../../../lib/useOwnerStudiosGuard";

type InstructorProfile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_active?: boolean | null;
};

type StaffRow = {
  studio_id: string;
  role?: string | null;
  commission_rate?: number | null;
  studio?: {
    uuid?: string | null;
    name?: string | null;
    city?: string | null;
    address?: string | null;
  } | null;
};

type InstructorPayload = {
  profile: InstructorProfile | null;
  staff: StaffRow[];
  classes: ClassEvent[];
};

export default function OwnerInstructorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const instructorId = typeof params?.id === "string" ? params.id : "";
  const { studios } = useOwnerStudiosGuard();
  const [commissionRates, setCommissionRates] = useState<Record<string, string>>({});
  const [savingRates, setSavingRates] = useState<Record<string, boolean>>({});
  const [payoutForm, setPayoutForm] = useState({
    amount: "",
    date: "",
    studioId: "",
    note: "",
  });
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);

  const studioIds = useMemo(() => studios.map((studio) => studio.uuid), [studios]);

  const { data, isLoading, mutate } = useSWR<InstructorPayload>(
    instructorId ? `owner:instructor:${instructorId}` : null,
    async () => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone_number, bio, avatar_url, is_active")
        .eq("id", instructorId)
        .single();
      if (profileError) throw profileError;

      const { data: staffData, error: staffError } = await supabase
        .from("tenant_staff")
        .select("studio_id, role, commission_rate, studio:studios(uuid, name, city, address)")
        .eq("user_id", instructorId);
      if (staffError) throw staffError;

      const classes = await fetchClasses({ trainer: instructorId, studioIds, orderBy: "start_time", orderAsc: true });

      return {
        profile: profileData as InstructorProfile,
        staff: (staffData || []) as StaffRow[],
        classes,
      };
    },
  );

  useEffect(() => {
    if (data?.staff) {
      const nextRates: Record<string, string> = {};
      data.staff.forEach((row) => {
        if (row.studio_id) {
          nextRates[row.studio_id] = row.commission_rate?.toString() ?? "";
        }
      });
      setCommissionRates(nextRates);
    }
  }, [data?.staff]);

  useEffect(() => {
    if (data?.staff?.length && !payoutForm.studioId) {
      setPayoutForm((prev) => ({ ...prev, studioId: data.staff[0].studio_id }));
      return;
    }
    if (!data?.staff?.length && studios.length === 1 && !payoutForm.studioId) {
      setPayoutForm((prev) => ({ ...prev, studioId: studios[0].uuid }));
    }
  }, [data?.staff, payoutForm.studioId, studios]);

  const handleSaveCommission = async (studioId: string) => {
    setSavingRates((prev) => ({ ...prev, [studioId]: true }));
    try {
      const rateValue = commissionRates[studioId];
      const commissionRate = rateValue === "" ? null : Number(rateValue);
      const { error } = await supabase
        .from("tenant_staff")
        .update({ commission_rate: commissionRate })
        .eq("studio_id", studioId)
        .eq("user_id", instructorId);
      if (error) throw error;
      await mutate();
    } catch (err) {
      console.error(err);
      alert("Unable to save commission rate.");
    } finally {
      setSavingRates((prev) => ({ ...prev, [studioId]: false }));
    }
  };

  const handlePayoutSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data?.profile) return;
    setPayoutStatus(null);
    try {
      const { error } = await supabase.from("finance_entries").insert({
        studio_id: payoutForm.studioId,
        entry_type: "expense",
        amount: Number(payoutForm.amount || 0),
        currency: "KZT",
        payment_date: payoutForm.date,
        receiver_name: `${data.profile.first_name ?? ""} ${data.profile.last_name ?? ""}`.trim(),
        category: "Instructor salary",
        description: payoutForm.note || null,
      });
      if (error) throw error;
      setPayoutStatus("Salary payout logged.");
      setPayoutForm((prev) => ({ ...prev, amount: "", date: "", note: "" }));
    } catch (err) {
      console.error(err);
      setPayoutStatus("Unable to log payout. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">Loading instructor profile...</div>;
  }

  if (!data?.profile) {
    return <div className="p-6 text-slate-500">Instructor not found.</div>;
  }

  const instructorName = `${data.profile.first_name ?? ""} ${data.profile.last_name ?? ""}`.trim();
  const initials = `${data.profile.first_name?.[0] ?? ""}${data.profile.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 text-sm text-slate-500 mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/owner/instructors")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Instructors
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-semibold">
            {initials || "IN"}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{instructorName || "Instructor"}</h1>
            <p className="text-slate-500 mt-1">{data.profile.is_active ? "Active instructor" : "Inactive instructor"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/owner/classes"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
          >
            <CalendarCheck size={16} />
            View schedule
          </Link>
          <a
            href={data.profile.email ? `mailto:${data.profile.email}` : "#"}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Mail size={16} />
            Message instructor
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile details</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400" />
              <span>{data.profile.email || "No email on file"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-slate-400" />
              <span>{data.profile.phone_number || "No phone number"}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-slate-400" />
              <span>{data.staff[0]?.studio?.name || "No studio assignment"}</span>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs uppercase text-slate-400 tracking-wide mb-2">Bio</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {data.profile.bio || "No bio provided for this instructor yet."}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Assigned studios</h2>
          {data.staff.length === 0 ? (
            <p className="text-sm text-slate-500">This instructor is not assigned to any studio yet.</p>
          ) : (
            <ul className="space-y-4">
              {data.staff.map((row) => (
                <li key={row.studio_id} className="text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{row.studio?.name || "Studio"}</p>
                  <p className="text-slate-500">{row.studio?.address || row.studio?.city || "Location not set"}</p>
                  <p className="text-xs text-slate-400 mt-1">Role: {row.role || "Instructor"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Compensation settings</h2>
            <Banknote size={18} className="text-slate-400" />
          </div>
          {data.staff.length === 0 ? (
            <p className="text-sm text-slate-500">Assign the instructor to a studio to manage compensation.</p>
          ) : (
            <div className="space-y-4">
              {data.staff.map((row) => (
                <div key={row.studio_id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{row.studio?.name || "Studio"}</p>
                      <p className="text-xs text-slate-500">Commission rate for classes taught at this studio.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                          value={commissionRates[row.studio_id] ?? ""}
                          onChange={(event) => setCommissionRates((prev) => ({
                            ...prev,
                            [row.studio_id]: event.target.value,
                          }))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveCommission(row.studio_id)}
                        disabled={savingRates[row.studio_id]}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
                      >
                        <Save size={14} />
                        {savingRates[row.studio_id] ? "Saving" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Log salary payout</h2>
          {data.staff.length === 0 ? (
            <p className="text-sm text-slate-500">Assign the instructor to a studio before logging payouts.</p>
          ) : (
            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={payoutForm.amount}
                    onChange={(event) => setPayoutForm((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Payment date</label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={payoutForm.date}
                    onChange={(event) => setPayoutForm((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Studio</label>
                <select
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={payoutForm.studioId}
                  onChange={(event) => setPayoutForm((prev) => ({ ...prev, studioId: event.target.value }))}
                >
                  <option value="" disabled>Select studio</option>
                  {data.staff.map((row) => (
                    <option key={row.studio_id} value={row.studio_id}>
                      {row.studio?.name || "Studio"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  value={payoutForm.note}
                  onChange={(event) => setPayoutForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Optional description for the payout"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                <Banknote size={16} />
                Record payout
              </button>
              {payoutStatus && (
                <p className="text-sm text-slate-500">{payoutStatus}</p>
              )}
            </form>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Assigned classes</h2>
        {data.classes.length === 0 ? (
          <div className="text-sm text-slate-500">
            No classes assigned yet. You can schedule classes from the{" "}
            <Link href="/dashboard/owner/classes" className="text-purple-600 hover:text-purple-700 font-medium">
              classes calendar
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {data.classes.map((classItem) => (
              <div key={classItem.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-slate-100 rounded-xl p-4">
                <div>
                  <p className="font-semibold text-slate-900">{classItem.title}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(classItem.startAt).toLocaleString()} · {classItem.locationName}
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  {classItem.level.toUpperCase()} · {classItem.duration} min
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
