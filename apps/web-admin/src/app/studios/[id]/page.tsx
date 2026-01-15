"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Instagram,
  Star,
  ArrowRight,
} from "lucide-react";

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
  level?: string | null;
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
  const [activeImage, setActiveImage] = useState(0);

  const { data: studio, isLoading: studioLoading } = useSWR<Studio>(
    studioId ? `/api/public/studios/${studioId}` : null,
    fetcher
  );
  const { data: classes } = useSWR<ClassCard[]>(
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

  const instagramUrl = useMemo(() => {
    if (!studio?.instagram) return null;
    if (studio.instagram.startsWith("http")) return studio.instagram;
    const handle = studio.instagram.replace(/^@/, "");
    return `https://www.instagram.com/${handle}`;
  }, [studio]);

  const mapUrl = useMemo(() => {
    if (!studio?.latitude || !studio?.longitude) return null;
    const lat = Number(studio.latitude);
    const lon = Number(studio.longitude);
    const delta = 0.01;
    const bbox = `${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat}%2C${lon}&layer=mapnik`;
  }, [studio]);

  const mapLink = useMemo(() => {
    if (!studio?.latitude || !studio?.longitude) return null;
    const lat = Number(studio.latitude);
    const lon = Number(studio.longitude);
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
  }, [studio]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
            Back to search
          </Link>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-5 lg:sticky lg:top-6 h-fit">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-widest text-slate-400">Studio</div>
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

            <div className="grid gap-2">
              {studio.phone && (
                <a
                  href={`tel:${studio.phone}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 sm:w-auto"
                >
                  <Phone size={14} /> Call studio
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 sm:w-auto"
                >
                  <Instagram size={14} /> Instagram
                </a>
              )}
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              {studio.address && (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 text-slate-400" />
                  <span>{studio.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  {classes?.length ? `${classes.length} upcoming` : "No classes yet"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  {stats.total ? "Rated" : "New studio"}
                </span>
              </div>
            </div>

            {mapUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  title="Studio map"
                  src={mapUrl}
                  className="h-40 w-full sm:h-44"
                  loading="lazy"
                />
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="block border-t border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Open in map
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
                Map preview coming soon.
              </div>
            )}

            <Link
              href={`/classes?studioId=${studioId}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Book a class <ArrowRight size={14} />
            </Link>
          </aside>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="relative h-[240px] w-full overflow-hidden rounded-xl bg-slate-100 sm:h-[320px]">
                <Image
                  src={images[activeImage]}
                  alt={studio.name}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 640px, 100vw"
                />
              </div>
              <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
                {images.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border sm:h-16 sm:w-24 ${
                      activeImage === index ? "border-slate-900" : "border-transparent"
                    }`}
                  >
                    <Image
                      src={url}
                      alt=""
                      width={96}
                      height={64}
                      className="h-full w-full object-cover"
                      sizes="96px"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Reviews</h2>
              {(reviews || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No reviews yet. Be the first to share your experience.
                </div>
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
