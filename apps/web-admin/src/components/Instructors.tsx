"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Instagram, Mail } from "lucide-react";
import Image from "next/image";
import { supabase } from "../lib/supabase";

type InstructorProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  studio_name?: string | null;
  studio_city?: string | null;
};

type ProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

type StaffRow = {
  user_id?: string | null;
  studio?: {
    name?: string | null;
    city?: string | null;
  } | null;
};

export function Instructors() {
  const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, bio, avatar_url")
          .eq("role", "instructor")
          .order("first_name", { ascending: true })
          .limit(200);

        if (profileError) throw profileError;

        const rows = (profiles as ProfileRow[] | null | undefined) || [];
        const ids = rows.map((row) => row.id).filter(Boolean);
        const studioMap = new Map<string, { name?: string | null; city?: string | null }>();

        if (ids.length > 0) {
          const { data: staffRows, error: staffError } = await supabase
            .from("tenant_staff")
            .select("user_id, studio:studios(name, city)")
            .in("user_id", ids);

          if (staffError) throw staffError;

          (staffRows as StaffRow[] | null | undefined)?.forEach((row) => {
            const userId = row.user_id || "";
            if (!userId || studioMap.has(userId)) return;
            studioMap.set(userId, {
              name: row.studio?.name ?? null,
              city: row.studio?.city ?? null,
            });
          });
        }

        const mapped = rows.map((row) => {
          const studio = studioMap.get(row.id);
          return {
            id: row.id,
            first_name: row.first_name ?? null,
            last_name: row.last_name ?? null,
            bio: row.bio ?? null,
            avatar_url: row.avatar_url ?? null,
            studio_name: studio?.name ?? null,
            studio_city: studio?.city ?? null,
          };
        });

        if (active) {
          setInstructors(mapped);
        }
      } catch (err) {
        console.error("Failed to load instructors", err);
        if (active) {
          setError("Unable to load instructors right now.");
          setInstructors([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const emptyCopy = useMemo(() => {
    if (loading) return "Loading instructors...";
    if (error) return error;
    return "No instructors found yet.";
  }, [loading, error]);

  return (
    <section id="instructors" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="mb-4">Meet Our Instructors</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Learn from passionate professionals dedicated to helping you achieve your dance goals
          </p>
        </div>

        {instructors.length === 0 ? (
          <div className="text-center text-gray-500">{emptyCopy}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {instructors.map((instructor) => {
              const name = `${instructor.first_name || ""} ${instructor.last_name || ""}`
                .trim() || "Instructor";
              const initials = `${instructor.first_name?.[0] || ""}${instructor.last_name?.[0] || ""}`
                .trim()
                .toUpperCase() || "IN";
              const studioLabel = instructor.studio_name
                ? `${instructor.studio_name}${instructor.studio_city ? ` · ${instructor.studio_city}` : ""}`
                : "Independent";

              return (
                <div key={instructor.id} className="group relative">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg mb-4 bg-gray-100">
                    {instructor.avatar_url ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={instructor.avatar_url}
                          alt={name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                        />
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-3xl font-semibold text-gray-500">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="mb-1">{name}</h3>
                    <p className="text-purple-600 mb-2">{studioLabel}</p>
                    <p className="text-gray-600 mb-4">
                      {instructor.bio || "Dance instructor"}
                    </p>
                    <div className="flex justify-center gap-3">
                      <a
                        href="#"
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-purple-100 hover:text-purple-600 transition-colors"
                      >
                        <Instagram size={18} />
                      </a>
                      <a
                        href="#"
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-purple-100 hover:text-purple-600 transition-colors"
                      >
                        <Mail size={18} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
