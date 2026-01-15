"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, Loader2, MessageCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/useAuthUser";

type BookingDetails = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

type BookingRecord = {
  uuid: string;
  status: string;
  slot?: {
    title?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    price?: number | null;
    currency?: string | null;
    studio?: {
      name?: string | null;
      whatsapp?: string | null;
    } | null;
  } | null;
};

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const bookingId = (searchParams.get("bookingId") || "").trim();
  const { user, loading: authLoading } = useAuthUser();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<BookingDetails | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("bookingDetails");
    if (raw) {
      try {
        setDetails(JSON.parse(raw));
      } catch {
        setDetails(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data: bookingRow, error: bookingError } = await supabase
        .from("bookings")
        .select("uuid, status, appointment_slot")
        .eq("uuid", bookingId)
        .maybeSingle();

      if (!mounted) return;
      if (bookingError) {
        setError(bookingError.message);
        setBooking(null);
        setLoading(false);
        return;
      }

      const slotId = bookingRow?.appointment_slot;
      if (!slotId) {
        setBooking(bookingRow as BookingRecord);
        setLoading(false);
        return;
      }

      const { data: slotRow, error: slotError } = await supabase
        .from("slots")
        .select("title, start_time, end_time, price, currency, studio_id")
        .eq("uuid", slotId)
        .maybeSingle();

      if (!mounted) return;
      if (slotError) {
        setError(slotError.message);
        setBooking(null);
        setLoading(false);
        return;
      }

      let studioRow: { name?: string | null; whatsapp?: string | null } | null = null;
      if (slotRow?.studio_id) {
        const { data: studioData, error: studioError } = await supabase
          .from("studios")
          .select("name, whatsapp")
          .eq("uuid", slotRow.studio_id)
          .maybeSingle();
        if (studioError) {
          setError(studioError.message);
          setBooking(null);
          setLoading(false);
          return;
        }
        studioRow = studioData || null;
      }

      const payload: BookingRecord = {
        uuid: bookingRow?.uuid || bookingId,
        status: bookingRow?.status || "confirmed",
        slot: {
          title: slotRow?.title || null,
          start_time: slotRow?.start_time || null,
          end_time: slotRow?.end_time || null,
          price: slotRow?.price ?? null,
          currency: slotRow?.currency || null,
          studio: studioRow,
        },
      };

      setBooking(payload);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [bookingId]);

  const dateLabel = useMemo(() => {
    if (!booking?.slot?.start_time) return "";
    const start = new Date(booking.slot.start_time);
    const end = booking.slot.end_time ? new Date(booking.slot.end_time) : null;
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
    return `${date} - ${time}`;
  }, [booking?.slot?.start_time, booking?.slot?.end_time]);

  const priceLabel = useMemo(() => {
    const currency = booking?.slot?.currency || "USD";
    const amount = booking?.slot?.price ?? 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }, [booking?.slot?.currency, booking?.slot?.price]);

  const whatsappNumber = useMemo(() => {
    const raw = booking?.slot?.studio?.whatsapp || "";
    return raw.replace(/[^\d]/g, "");
  }, [booking?.slot?.studio?.whatsapp]);

  const fullName = useMemo(() => {
    const first = details?.firstName || user?.first_name || "";
    const last = details?.lastName || user?.last_name || "";
    return `${first} ${last}`.trim();
  }, [details?.firstName, details?.lastName, user?.first_name, user?.last_name]);

  const email = details?.email || user?.email || "";
  const phone = details?.phone || user?.phone_number || "";

  const message = useMemo(() => {
    const studioName = booking?.slot?.studio?.name || "Studio";
    const classTitle = booking?.slot?.title || "Dance class";
    const parts = [
      `Hi ${studioName},`,
      `I'd like to confirm payment for "${classTitle}".`,
      dateLabel ? `Date/time: ${dateLabel}.` : null,
      priceLabel ? `Price: ${priceLabel}.` : null,
      bookingId ? `Booking ID: ${bookingId}.` : null,
      fullName ? `Name: ${fullName}.` : null,
      email ? `Email: ${email}.` : null,
      phone ? `Phone: ${phone}.` : null,
    ].filter(Boolean);
    return parts.join(" ");
  }, [booking?.slot?.studio?.name, booking?.slot?.title, dateLabel, priceLabel, bookingId, fullName, email, phone]);

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : "";
  const whatsappWebUrl = whatsappNumber
    ? `https://web.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`
    : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="py-16 text-center text-slate-500">
          <Loader2 className="inline-block animate-spin mr-2" size={16} />
          Loading payment...
        </div>
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="py-16 text-center text-slate-500">Booking id is missing.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="py-16 text-center text-slate-500">
          Unable to load payment details: {error}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="py-16 text-center text-slate-500">Booking not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/dashboard/student" className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Payment</h1>
            <p className="text-sm text-slate-500">
              Contact the studio via WhatsApp to complete payment.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">
              {booking.slot?.title || "Dance class"}
            </div>
            {dateLabel && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar size={16} /> {dateLabel}
              </div>
            )}
            <div className="text-sm text-slate-600">
              Studio: {booking.slot?.studio?.name || "Studio"}
            </div>
            <div className="text-sm font-semibold text-slate-900">Total: {priceLabel}</div>
          </div>

          {!authLoading && !user ? (
            <div className="text-sm text-slate-500">
              Sign in to see your booking details.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
              <div>Booking ID: {bookingId}</div>
              {fullName && <div>Name: {fullName}</div>}
              {email && <div>Email: {email}</div>}
              {phone && <div>Phone: {phone}</div>}
            </div>
          )}

          {whatsappNumber ? (
            <div className="space-y-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
              >
                <MessageCircle size={18} /> Pay via WhatsApp
              </a>
              <a
                href={whatsappWebUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900"
              >
                Open WhatsApp Web
              </a>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Studio WhatsApp number is missing. Please contact the studio directly.
            </div>
          )}

          <Link
            href="/dashboard/student/bookings"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900"
          >
            Back to my bookings
          </Link>
        </div>
      </section>
    </div>
  );
}
