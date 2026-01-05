"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMyStudios, type Studio } from "./studios";
import { useAuthUser } from "./useAuthUser";

type UseOwnerStudiosGuardOptions = {
  redirectTo?: string;
};

export function useOwnerStudiosGuard(options: UseOwnerStudiosGuardOptions = {}) {
  const router = useRouter();
  const { role, loading: authLoading } = useAuthUser();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    const redirectTo = options.redirectTo || "/dashboard/student";
    if (role && role !== "owner" && role !== "super_admin") {
      router.replace(redirectTo);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMyStudios();
        setStudios(data);
        if (role === "owner" && data.length === 0) {
          router.replace(redirectTo);
        }
      } catch (err) {
        console.warn("Failed to load owner studios", err);
        if (role === "owner") {
          router.replace(redirectTo);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, role, router, options.redirectTo, refreshKey]);

  return {
    studios,
    loading,
    role,
    reload: () => setRefreshKey((prev) => prev + 1),
  };
}
