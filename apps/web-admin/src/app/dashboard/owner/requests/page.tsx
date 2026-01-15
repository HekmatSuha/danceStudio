"use client";

import React, { useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock, Mail, MapPin, Phone, XCircle } from "lucide-react";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";
import { useAuthedSWR } from "../../../../lib/useAuthedSWR";
import { supabase } from "../../../../lib/supabase";

type BookingRequest = {
  id: string;
  status: string;
  booking_date?: string | null;
  slot?: {
    id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    price?: number | null;
    currency?: string | null;
    studio_id?: string | null;
    studio_name?: string | null;
  } | null;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone_number?: string;
  } | null;
};

type RentalRequest = {
  id: string;
  status: string;
  start_time?: string | null;
  end_time?: string | null;
  total_price?: number | null;
  room?: {
    id: string;
    name: string;
    studio_id?: string | null;
    studio_name?: string | null;
  } | null;
  renter?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone_number?: string;
  } | null;
};

type ActionState = Record<string, boolean>;

async function authedFetch(url: string, options: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

export default function OwnerRequestsPage() {
  const { studios, loading: studiosLoading, role } = useOwnerStudiosGuard();
  const [actionState, setActionState] = useState<ActionState>({});
  const [error, setError] = useState<string | null>(null);

  const studioIdsParam = useMemo(
    () => studios.map((studio) => studio.uuid).join(","),
    [studios]
  );

  const {
    data: bookingRequests,
    isLoading: bookingsLoading,
    mutate: mutateBookings,
  } = useAuthedSWR<BookingRequest[]>(
    studioIdsParam ? `/api/owner/requests/bookings?studioIds=${studioIdsParam}` : null
  );

  const {
    data: rentalRequests,
    isLoading: rentalsLoading,
    mutate: mutateRentals,
  } = useAuthedSWR<RentalRequest[]>(
    studioIdsParam ? `/api/owner/requests/rentals?studioIds=${studioIdsParam}` : null
  );

  const setBusy = (id: string, value: boolean) =>
    setActionState((prev) => ({ ...prev, [id]: value }));

  const updateBookingStatus = async (id: string, status: "confirmed" | "cancelled") => {
    setError(null);
    setBusy(id, true);
    try {
      await authedFetch(`/api/owner/requests/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await mutateBookings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update booking.");
    } finally {
      setBusy(id, false);
    }
  };

  const updateRentalStatus = async (id: string, status: "confirmed" | "cancelled") => {
    setError(null);
    setBusy(id, true);
    try {
      await authedFetch(`/api/owner/requests/rentals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await mutateRentals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update rental.");
    } finally {
      setBusy(id, false);
    }
  };

  if (studiosLoading) {
    return <div className="p-6 text-slate-500">Loading requests...</div>;
  }

  if (role === "owner" && studios.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Requests</h1>
        <p className="text-slate-600 mt-1">Approve students and room rentals.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Student requests</h2>
            <p className="text-sm text-slate-500">Confirm payments and approve bookings.</p>
          </div>
          {bookingsLoading && (
            <div className="text-sm text-slate-400">Loading...</div>
          )}
        </div>

        {(bookingRequests || []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No pending student requests.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {(bookingRequests || []).map((req) => {
              const start = req.slot?.start_time ? new Date(req.slot.start_time) : null;
              const end = req.slot?.end_time ? new Date(req.slot.end_time) : null;
              const timeLabel =
                start && end
                  ? `${start.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })} · ${start.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })} - ${end.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : "Schedule pending";
              const busy = actionState[req.id];
              return (
                <div key={req.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {req.slot?.title || "Class"}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {req.slot?.studio_name || "Studio"}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <span>{timeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-slate-400" />
                      <span>{req.slot?.studio_name || "Studio"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-slate-400" />
                      <span>{req.student?.email || "No email"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-slate-400" />
                      <span>{req.student?.phone_number || "No phone"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">
                      {req.slot?.currency || "USD"} {req.slot?.price ?? 0}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateBookingStatus(req.id, "cancelled")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBookingStatus(req.id, "confirmed")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} /> Confirm payment
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Teacher room requests</h2>
            <p className="text-sm text-slate-500">Approve room rental requests from teachers.</p>
          </div>
          {rentalsLoading && (
            <div className="text-sm text-slate-400">Loading...</div>
          )}
        </div>

        {(rentalRequests || []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No pending rental requests.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {(rentalRequests || []).map((req) => {
              const start = req.start_time ? new Date(req.start_time) : null;
              const end = req.end_time ? new Date(req.end_time) : null;
              const timeLabel =
                start && end
                  ? `${start.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })} · ${start.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })} - ${end.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : "Schedule pending";
              const busy = actionState[req.id];
              return (
                <div key={req.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {req.room?.name || "Room rental"}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {req.room?.studio_name || "Studio"}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <span>{timeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-slate-400" />
                      <span>{req.renter?.email || "No email"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-slate-400" />
                      <span>{req.renter?.phone_number || "No phone"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      <span>Total: {req.total_price ?? 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">
                      {req.total_price ?? 0}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateRentalStatus(req.id, "cancelled")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRentalStatus(req.id, "confirmed")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
