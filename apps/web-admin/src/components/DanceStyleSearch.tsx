"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type DanceStyle = {
  uuid: string;
  name: string;
};

type StudioResult = {
  studio: {
    uuid: string;
    name: string;
    city?: string | null;
    address?: string | null;
  };
  styles: string[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DanceStyleSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("style") || "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useSWR<DanceStyle[]>("/api/public/dance-styles", fetcher);
  const { isLoading } = useSWR<StudioResult[]>(
    debouncedQuery.length >= 2
      ? `/api/public/studios-by-style?q=${encodeURIComponent(debouncedQuery)}`
      : null,
    fetcher
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    if (debouncedQuery.length >= 2) {
      if (params.get("q") !== debouncedQuery) {
        params.set("q", debouncedQuery);
        params.delete("style");
        router.replace(`/?${params.toString()}`, { scroll: false });
      }
    } else if (params.has("q") || params.has("style")) {
      params.delete("q");
      params.delete("style");
      const next = params.toString();
      router.replace(next ? `/?${next}` : "/", { scroll: false });
    }
  }, [debouncedQuery, router, searchParamsString]);

  return (
    <section className="relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(147,51,234,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_35%)]" />
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-10">
        <div className="grid gap-6 lg:grid-cols-1 lg:items-center">
          <div className="space-y-4 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Search dance styles
            </h1>

            <div className="mx-auto w-full max-w-2xl rounded-full border border-slate-200 bg-white shadow-lg shadow-purple-100/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center">
                  <Search size={20} />
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search style, studio, or instructor..."
                  className="flex-1 text-base md:text-lg border-none focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {debouncedQuery.length >= 2 && isLoading && (
          <div className="mt-4 text-center text-slate-400">Searching studios...</div>
        )}
      </div>
    </section>
  );
}
