"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthUser } from "../../lib/useAuthUser";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;
    if (!user?.must_reset_password) return;
    if (pathname?.startsWith("/reset")) return;
    router.replace(`/reset`);
  }, [loading, user, pathname, router]);

  return <>{children}</>;
}
