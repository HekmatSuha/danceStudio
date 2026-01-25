"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { type Studio, fetchMyStudios } from "./studios";
import { useAuthUser } from "./useAuthUser";

type UseOwnerStudiosGuardOptions = {
  redirectTo?: string;
};

export function useOwnerStudiosGuard(options: UseOwnerStudiosGuardOptions = {}) {
  const router = useRouter();
  const { role, user, loading: authLoading } = useAuthUser();
  
  const shouldFetch = !authLoading && !!user && (role === "owner" || role === "super_admin");
  
  const { data, isLoading, mutate } = useSWR<Studio[]>(
    shouldFetch ? ["studios", user.uuid] : null,
    async () => fetchMyStudios(),
    {
      revalidateOnFocus: false,
    }
  );

  const studios = data || [];
  const loading = isLoading || authLoading;

  useEffect(() => {
    if (authLoading) return;

    const redirectTo = options.redirectTo || "/dashboard/student";
    if (role && role !== "owner" && role !== "super_admin") {
      router.replace(redirectTo);
      return;
    }
    if (!loading && role === "owner" && studios.length === 0) {
      // Allow them to stay if they are creating a studio, but generally warn or redirect
      // router.replace(redirectTo);
    }
  }, [authLoading, role, router, options.redirectTo, loading, studios.length]);

  return {
    studios,
    loading,
    role,
    reload: () => mutate(),
  };
}
