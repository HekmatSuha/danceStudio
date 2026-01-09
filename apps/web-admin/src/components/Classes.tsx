"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Users, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type ClassCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  duration: string;
  level: string;
  capacity: number;
  styleName?: string | null;
  studioId?: string | null;
  studioName?: string | null;
  studioCity?: string | null;
  studioAddress?: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Classes() {
  const searchParams = useSearchParams();
  const style = (searchParams.get("style") || "").trim();
  const url = style
    ? `/api/public/classes?style=${encodeURIComponent(style)}&limit=16`
    : "/api/public/classes?limit=16";
  const { data, isLoading } = useSWR<ClassCard[]>(url, fetcher);
  const classes = data || [];
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const handleScroll = () => {
    updateScrollState();
  };

  const handleNav = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const offset = el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "left" ? -offset : offset, behavior: "smooth" });
  };

  const heading = useMemo(() => {
    if (!style) return "Popular classes";
    return `Classes for "${style}"`;
  }, [style]);

  const fallbackImages = useMemo(
    () => [
      "https://images.unsplash.com/photo-1495791185843-c73f2269f669?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1609602961949-eddbb90383cc?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1550026593-cb89847b168d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80",
    ],
    []
  );

  useEffect(() => {
    updateScrollState();
  }, [classes.length]);

  useEffect(() => {
    const handleResize = () => updateScrollState();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section id="classes" className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">{heading}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleNav("left")}
              disabled={!canScrollLeft}
              className="h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 disabled:opacity-40"
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} className="mx-auto" />
            </button>
            <button
              type="button"
              onClick={() => handleNav("right")}
              disabled={!canScrollRight}
              className="h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 disabled:opacity-40"
              aria-label="Scroll right"
            >
              <ChevronRight size={18} className="mx-auto" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400 py-8">Loading classes...</div>
        ) : classes.length === 0 ? (
          <div className="text-center text-slate-500 py-8">No classes found.</div>
        ) : (
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto scroll-smooth pb-2"
          >
            {classes.map((classItem, index) => {
              const fallbackUrl = fallbackImages[index % fallbackImages.length];
              const imageUrl = failedImages[classItem.id]
                ? fallbackUrl
                : classItem.imageUrl || fallbackUrl;
              return (
              <Link
                key={classItem.id}
                href={classItem.studioId ? `/studios/${classItem.studioId}` : "/studios"}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow min-w-[260px] sm:min-w-[300px] lg:min-w-[280px] w-[260px] sm:w-[300px] lg:w-[280px] shrink-0"
              >
                <div className="relative h-44 w-full">
                  <Image
                    src={imageUrl}
                    alt={classItem.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 280px, (min-width: 640px) 300px, 260px"
                    onError={() => {
                      if (!failedImages[classItem.id]) {
                        setFailedImages((prev) => ({ ...prev, [classItem.id]: true }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                    }}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm hover:text-rose-500"
                    aria-label="Save class"
                  >
                    <Heart size={16} />
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {classItem.styleName || "Dance class"}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
                    {classItem.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-1">
                    {classItem.studioName || "Studio"}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-slate-600 pt-2">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{classItem.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      <span>Max {classItem.capacity}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )})}
          </div>
        )}
      </div>
    </section>
  );
}
