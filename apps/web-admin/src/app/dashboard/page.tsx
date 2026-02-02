"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "../../lib/useAuthUser";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, role, loading } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/");
      } else if (role) {
        const slugMap: Record<string, string> = {
          owner: "owner",
          instructor: "instructor",
          student: "student",
          super_admin: "super-admin",
        };
        const slug = slugMap[role] || "student";
        router.replace(`/dashboard/${slug}`);
      }
    }
  }, [user, role, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="animate-spin text-purple-600" size={32} />
        <p>Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
