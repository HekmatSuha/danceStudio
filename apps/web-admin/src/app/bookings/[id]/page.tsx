"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Calendar, MapPin, Loader2, ArrowLeft } from "lucide-react";
import { createBooking } from "@/lib/bookings";
import { useAuthUser } from "@/lib/useAuthUser";

type SlotDetail = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  price: number;
  currency: string;
  capacity: number;
  imageUrl: string | null;
  studio: {
    uuid: string;
    name: string;
    city?: string | null;
    address?: string | null;
  } | null;
};

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const error = new Error(data.error || "Failed to load.") as Error & { status?: number };
      error.status = res.status;
      throw error;
    }
    return res.json();
  });

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotId = typeof params?.id === "string" ? params.id : "";
  const studioId = (searchParams.get("studio") || "").trim();
  const { user, loading: authLoading } = useAuthUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: slot, isLoading } = useSWR<SlotDetail>(
    slotId ? `/api/public/classes/${slotId}` : null,
    fetcher,
    {
      shouldRetryOnError: false,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Never retry on 404
        if (error.status === 404) return;
        // Only retry up to 3 times for other errors
        if (retryCount >= 3) return;
        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );

  const dateLabel = useMemo(() => {
    if (!slot?.startTime) return "";
    const start = new Date(slot.startTime);
    const end = slot?.endTime ? new Date(slot.endTime) : null;
    const date = start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const time = end
      ? `${start.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })} - ${end.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}`
      : start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${date} • ${time}`;
  }, [slot?.startTime, slot?.endTime]);

  const durationLabel = useMemo(() => {
    if (!slot?.startTime || !slot?.endTime) return "";
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    if (!minutes) return "";
    return `${minutes} min`;
  }, [slot?.startTime, slot?.endTime]);

  const handleConfirm = async () => {
    if (!slotId) return;
    setError(null);
    setSubmitting(true);
    try {
      await createBooking(slotId);
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/student");
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to book this class.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="py-16 text-center text-slate-500">Loading booking…</div>;
  }

  if (!slot) {
    return (
      <div className="py-16 text-center text-slate-500">
        <div className="mb-3 text-base font-semibold text-slate-700">
          Class not found.
        </div>
        <p className="mb-6 text-sm text-slate-500">
          It may have been removed or the link is out of date.
        </p>
        <Link
          href={studioId ? `/studios/${studioId}` : "/"}
          className="inline-flex items-center justify-center rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          {studioId ? "Back to studio" : "Back to home"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href={`/studios/${slot.studio?.uuid || ""}`} className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700">
          <ArrowLeft size={16} /> Back to studio
        </Link>

        <div className="mt-6 grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {slot.imageUrl && (
              <div className="relative h-60 w-full">
                <Image
                  src={slot.imageUrl}
                  alt={slot.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 480px, 100vw"
                />
              </div>
            )}
            <div className="p-6 space-y-3">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{slot.title}</h1>
                {slot.studio && (
                  <p className="text-sm text-slate-500">{slot.studio.name}</p>
                )}
              </div>
              <p className="text-sm text-slate-600">{slot.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <Calendar size={16} /> {dateLabel}
                </span>
                {slot.studio?.address && (
                  <span className="flex items-center gap-2">
                    <MapPin size={16} /> {slot.studio.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Confirm booking</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Price</span>
              <span className="font-semibold text-slate-900">
                {slot.currency} {slot.price}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Duration</span>
              <span className="font-semibold text-slate-900">
                {durationLabel || "Standard"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Capacity</span>
              <span className="font-semibold text-slate-900">
                {slot.capacity || 0} seats
              </span>
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Booking confirmed. Redirecting…
              </div>
            )}

            {!user && !authLoading ? (
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center rounded-full bg-purple-600 text-white py-3 text-sm font-semibold hover:bg-purple-700"
              >
                Sign in to book
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || success}
                className="w-full inline-flex items-center justify-center rounded-full bg-purple-600 text-white py-3 text-sm font-semibold hover:bg-purple-700 disabled:opacity-70"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Booking…
                  </span>
                ) : (
                  "Confirm booking"
                )}
              </button>
            )}
            <p className="text-xs text-slate-400">
              Payment is handled at the studio. You can cancel from your dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
