"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";

export function AuthBridgeClient() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    const access = params.get("access");
    const refresh = params.get("refresh");
    if (!access || !refresh) return;
    handledRef.current = true;

    supabase.auth
      .setSession({ access_token: access, refresh_token: refresh })
      .then(({ error }) => {
        if (error) {
          console.warn("Bridge sign-in failed", error);
          return;
        }
        router.replace(pathname);
      })
      .catch((err) => {
        console.warn("Bridge sign-in failed", err);
      });
  }, [params, pathname, router]);

  return null;
}
