"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "../../components/AuthModal";
import { useAuthUser } from "../../lib/useAuthUser";
import { type UserRole } from "../../lib/auth";

    const slugMap: Record<UserRole, string> = {
      owner: 'owner',
      instructor: 'instructor',
      student: 'student',
      super_admin: 'super-admin'
    };

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, loading } = useAuthUser();
  const initialMode = useMemo(
    () => (searchParams?.get("mode") === "signup" ? "signup" : "signin"),
    [searchParams],
  );
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      const destination = role ? `/dashboard/${slugMap[role]}` : "/dashboard";
      router.replace(destination);
    }
  }, [loading, user, role, router]);

  const handleClose = () => {
    setIsOpen(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-pink-600 to-orange-500 flex items-center justify-center p-6">
      <AuthModal
        isOpen={isOpen}
        onClose={handleClose}
        initialMode={initialMode}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
