"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Clock, UserRound, MapPin } from "lucide-react";

type ClassCard = {
  id: string;
  title: string;
  description: string;
  duration: string;
  price: number;
  currency: string;
  level?: string | null;
  styleName?: string | null;
  studioId?: string | null;
  studioName?: string | null;
  trainerName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

type Studio = {
  uuid: string;
  name: string;
  city?: string | null;
};

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to load.");
    }
    return res.json();
  });

export default function ClassesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioId = (searchParams.get("studioId") || "").trim();
  const style = (searchParams.get("style") || "").trim();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    if (style) {
      params.set("style", style);
    }
    if (studioId) {
      params.set("studioId", studioId);
    }
    const next = params.toString();
    router.replace(next ? `/classes?${next}` : "/classes", { scroll: false });
  }, [debouncedQuery, router, searchParamsString, studioId, style]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (style) params.set("style", style);
    if (studioId) params.set("studioId", studioId);
    params.set("limit", "60");
    return `/api/public/classes?${params.toString()}`;
  }, [debouncedQuery, style, studioId]);

  const { data, isLoading } = useSWR<ClassCard[]>(url, fetcher);
  const { data: studio } = useSWR<Studio>(
    studioId ? `/api/public/studios/${studioId}` : null,
    fetcher
  );
  const classes = data || [];

  const formatPrice = (currency: string, amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  };

  const getTimeLabel = (slot: ClassCard) => {
    const start = slot.startTime ? new Date(slot.startTime) : null;
    const end = slot.endTime ? new Date(slot.endTime) : null;
    if (start && end) {
      const day = start.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const time = `${start.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })} - ${end.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}`;
      return `${day} · ${time}`;
    }
    return slot.duration;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-widest text-slate-400">
              Select a class
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {studio?.name ? `Classes at ${studio.name}` : "All classes"}
            </h1>
            {studio?.city && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={14} className="text-slate-400" />
                {studio.city}
              </div>
            )}
          </div>
          {studioId && (
            <Link href={`/studios/${studioId}`} className="text-sm text-slate-500 hover:text-slate-700">
              Back to studio
            </Link>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search class, instructor, or style..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400 py-8">Loading classes...</div>
        ) : classes.length === 0 ? (
          <div className="text-center text-slate-500 py-8">No classes found.</div>
        ) : (
          <div className="space-y-4">
            {classes.map((slot) => (
              <div
                key={slot.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    {slot.styleName || "Dance class"}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{slot.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {getTimeLabel(slot)}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserRound size={14} />
                      {slot.trainerName || "Instructor"}
                    </span>
                  </div>
                  {slot.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{slot.description}</p>
                  )}
                </div>
                <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:flex-col sm:items-end">
                  <div className="text-lg font-semibold text-slate-900">
                    {formatPrice(slot.currency, slot.price)}
                  </div>
                  <Link
                    href={`/bookings/${slot.id}${slot.studioId ? `?studio=${slot.studioId}` : ""}`}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Book now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
