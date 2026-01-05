"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Instagram,
  Star,
  ArrowRight,
} from "lucide-react";
import { useAuthUser } from "@/lib/useAuthUser";

type Studio = {
  uuid: string;
  name: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  instagram?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ClassCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  duration: string;
  capacity: number;
  price: number;
  currency: string;
  studioId?: string | null;
  studioName?: string | null;
  startTime?: string;
  endTime?: string;
};

type Review = {
  uuid: string;
  rating: number;
  comment: string;
  studio_response?: string | null;
  created_at: string;
  author_name: string;
};

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to load.");
    }
    return res.json();
  });

export default function StudioDetailPage() {
  const params = useParams();
  const studioId = typeof params?.id === "string" ? params.id : "";
  const { user, loading: authLoading } = useAuthUser();
  const [activeImage, setActiveImage] = useState(0);

  const { data: studio, isLoading: studioLoading } = useSWR<Studio>(
    studioId ? `/api/public/studios/${studioId}` : null,
    fetcher
  );
  const { data: classes, isLoading: classesLoading } = useSWR<ClassCard[]>(
    studioId ? `/api/public/classes?studioId=${studioId}&limit=50` : null,
    fetcher
  );
  const { data: reviews } = useSWR<Review[]>(
    studioId ? `/api/public/studios/${studioId}/reviews` : null,
    fetcher
  );

  const images = useMemo(() => {
    const items = (classes || [])
      .map((slot) => slot.imageUrl)
      .filter(Boolean);
    const unique = Array.from(new Set(items));
    if (unique.length > 0) return unique.slice(0, 8);
    return [
      "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=80",
    ];
  }, [classes]);

  const stats = useMemo(() => {
    const list = reviews || [];
    if (list.length === 0) return { avg: 0, total: 0 };
    const sum = list.reduce((acc, item) => acc + (item.rating || 0), 0);
    return { avg: sum / list.length, total: list.length };
  }, [reviews]);

  const mapUrl = useMemo(() => {
    if (!studio?.latitude || !studio?.longitude) return null;
    const lat = Number(studio.latitude);
    const lon = Number(studio.longitude);
    const delta = 0.01;
    const bbox = `${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat}%2C${lon}&layer=mapnik`;
  }, [studio?.latitude, studio?.longitude]);

  if (studioLoading) {
    return <div className="py-16 text-center text-slate-500">Loading studio...</div>;
  }

  if (!studio) {
    return (
      <div className="py-16 text-center text-slate-500">
        Studio not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <Link href="/" className="text-sm text-purple-600 hover:text-purple-700">
            ← Back to search
          </Link>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-slate-900">{studio.name}</h1>
              <p className="text-sm text-slate-500">{studio.city || "Studio"}</p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={16} fill="currentColor" />
                <span className="font-semibold text-slate-900">
                  {stats.total ? stats.avg.toFixed(1) : "New"}
                </span>
              </div>
              <span className="text-slate-500">
                {stats.total ? `${stats.total} reviews` : "No reviews yet"}
              </span>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              {studio.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  <span>{studio.phone}</span>
                </div>
              )}
              {studio.instagram && (
                <div className="flex items-center gap-2">
                  <Instagram size={16} className="text-slate-400" />
                  <span>{studio.instagram}</span>
                </div>
              )}
              {studio.address && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{studio.address}</span>
                </div>
              )}
            </div>

            {mapUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  title="Studio map"
                  src={mapUrl}
                  className="h-48 w-full"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
                Map preview coming soon.
              </div>
            )}
          </aside>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={images[activeImage]}
                  alt={studio.name}
                  className="h-[320px] w-full object-cover"
                />
              </div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {images.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border ${
                      activeImage === index ? "border-purple-500" : "border-transparent"
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Upcoming classes</h2>
                {classesLoading && (
                  <div className="text-xs text-slate-400">Loading…</div>
                )}
              </div>

              {(classes || []).length === 0 ? (
                <div className="text-sm text-slate-500">No classes available yet.</div>
              ) : (
                <div className="space-y-4">
                  {(classes || []).map((slot) => {
                    const start = slot.startTime ? new Date(slot.startTime) : null;
                    const end = slot.endTime ? new Date(slot.endTime) : null;
                    const dateLabel = start
                      ? start.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "Upcoming";
                    const timeLabel =
                      start && end
                        ? `${start.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })} - ${end.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : slot.duration;
                    return (
                      <div
                        key={slot.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-100 rounded-xl p-4"
                      >
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-slate-900">{slot.title}</h3>
                          <p className="text-sm text-slate-500 line-clamp-2">{slot.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {dateLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {timeLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold text-slate-900">
                            {slot.currency} {slot.price}
                          </div>
                          <Link
                            href={
                              user || authLoading
                                ? `/bookings/${slot.id}`
                                : "/login"
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
                          >
                            Book now <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Reviews</h2>
              {(reviews || []).length === 0 ? (
                <div className="text-sm text-slate-500">No reviews yet.</div>
              ) : (
                <div className="space-y-4">
                  {(reviews || []).slice(0, 6).map((review) => (
                    <div key={review.uuid} className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {review.author_name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={14} fill="currentColor" />
                          <span className="text-sm font-semibold text-slate-900">
                            {review.rating}
                          </span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
                      )}
                      {review.studio_response && (
                        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          Studio response: {review.studio_response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
