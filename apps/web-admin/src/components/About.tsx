"use client";

import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

type StudioCard = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  imageUrl: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function About() {
  const { data: studios, isLoading: studiosLoading } = useSWR<StudioCard[]>(
    "/api/public/studios?limit=all",
    fetcher
  );
  const studioCards = studios || [];

  return (
    <section id="studios" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="mb-2">Our studios</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore studios across the city and find your next class.
          </p>
        </div>

        {studiosLoading ? (
          <div className="text-center text-slate-400 py-6">Loading studios...</div>
        ) : studioCards.length === 0 ? (
          <div className="text-center text-slate-500 py-6">No studios found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {studioCards.map((studio) => (
              <Link
                key={studio.id}
                href={`/studios/${studio.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="relative h-40 w-full bg-slate-100">
                  <Image
                    src={studio.imageUrl}
                    alt={studio.name}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 280px, (min-width: 640px) 300px, 100vw"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
                    {studio.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin size={16} className="text-slate-400" />
                    <span className="line-clamp-1">{studio.city || "Studio"}</span>
                  </div>
                  {studio.address && (
                    <p className="text-sm text-slate-500 line-clamp-1">
                      {studio.address}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
