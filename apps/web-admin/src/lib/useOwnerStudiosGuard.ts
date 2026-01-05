"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { type Studio } from "./studios";
import { useAuthUser } from "./useAuthUser";
import { useAuthedSWR } from "./useAuthedSWR";

type UseOwnerStudiosGuardOptions = {
  redirectTo?: string;
};

export function useOwnerStudiosGuard(options: UseOwnerStudiosGuardOptions = {}) {
  const router = useRouter();
  const { role, loading: authLoading } = useAuthUser();
  const { data, isLoading, mutate } = useAuthedSWR<Studio[]>(
    authLoading ? null : "/api/owner/studios"
  );
  const studios = data || [];
  const loading = isLoading;

  useEffect(() => {
    if (authLoading) return;

    const redirectTo = options.redirectTo || "/dashboard/student";
    if (role && role !== "owner" && role !== "super_admin") {
      router.replace(redirectTo);
      return;
    }
    if (!isLoading && role === "owner" && studios.length === 0) {
      router.replace(redirectTo);
    }
  }, [authLoading, role, router, options.redirectTo, isLoading, studios.length]);

  return {
    studios,
    loading,
    role,
    reload: () => mutate(),
  };
}
