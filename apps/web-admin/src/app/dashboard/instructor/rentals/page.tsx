"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { Search, Building2 } from "lucide-react";

type StudioCard = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  imageUrl?: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InstructorRentalsPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useSWR<StudioCard[]>("/api/public/studios?limit=50", fetcher);

  const filteredStudios = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data || [];
    return (data || []).filter((studio) =>
      [studio.name, studio.city, studio.address].some((field) =>
        field?.toLowerCase().includes(q)
      )
    );
  }, [data, query]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Search studios for rent</h1>
        <p className="text-slate-600 mt-2">
          Find studios and request rental availability for your upcoming sessions.
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <Search size={18} />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by studio name, city, or address"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-10">Loading studios...</div>
      ) : filteredStudios.length === 0 ? (
        <div className="text-center text-slate-500 py-10">
          No studios match your search yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredStudios.map((studio) => (
            <div
              key={studio.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{studio.name}</h3>
                  <p className="text-sm text-slate-500">
                    {studio.city || "City"} {studio.address ? `• ${studio.address}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Available
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Building2 size={14} />
                Request a rental to see room availability.
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              >
                Request rental
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
