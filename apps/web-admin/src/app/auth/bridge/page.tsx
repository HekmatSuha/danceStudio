"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthBridgePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const access = params.get("access");
    const refresh = params.get("refresh");
    const redirectParam = params.get("redirect") || "/dashboard";
    const redirect = redirectParam.startsWith("/") ? redirectParam : "/dashboard";

    if (!access || !refresh) {
      setMessage("Missing login tokens. Please open the dashboard from the mobile app.");
      return;
    }

    supabase.auth
      .setSession({ access_token: access, refresh_token: refresh })
      .then(({ error }) => {
        if (error) {
          setMessage("Failed to sign in. Please try again from the mobile app.");
          return;
        }
        router.replace(redirect);
      })
      .catch(() => {
        setMessage("Failed to sign in. Please try again from the mobile app.");
      });
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Dance Studio</h1>
        <p className="text-slate-500 mt-2 text-sm">{message}</p>
      </div>
    </div>
  );
}
