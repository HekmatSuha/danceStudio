"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Instagram, Mail } from "lucide-react";
import Image from "next/image";

type InstructorProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  studio_name?: string | null;
  studio_city?: string | null;
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
        const res = await fetch("/api/public/instructors");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load instructors.");
        }
        const mapped = (await res.json()) as InstructorProfile[];

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
