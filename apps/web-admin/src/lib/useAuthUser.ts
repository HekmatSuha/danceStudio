'use client';

import { useEffect, useState } from "react";
import { fetchProfile, type AccountProfile, toUserRole, type UserRole } from "./auth";
import { supabase } from "./supabase";

type AuthUserState = {
  user: AccountProfile | null;
  role: UserRole | null;
  loading: boolean;
};

export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<AuthUserState>({
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    let inFlight = false;

    const resolveEffectiveRole = async (userId: string, role: UserRole) => {
      if (role === "owner" || role === "super_admin") return role;
      try {
        const [ownedResult, staffResult] = await Promise.all([
          supabase
            .from("studios")
            .select("uuid")
            .eq("owner_id", userId)
            .limit(1),
          supabase
            .from("tenant_staff")
            .select("id, role")
            .eq("user_id", userId)
            .in("role", ["admin", "owner"])
            .limit(1),
        ]);

        const ownsStudio = (ownedResult.data?.length ?? 0) > 0;
        const isStudioAdmin = (staffResult.data?.length ?? 0) > 0;
        if (ownsStudio || isStudioAdmin) return "owner";
      } catch {
        // If we can't resolve extra permissions, fall back to base role.
      }
      return role;
    };

    const loadProfile = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) setState({ user: null, role: null, loading: false });
          return;
        }
        
        const profile = await fetchProfile();
        if (mounted) {
          const baseRole = toUserRole(profile.roles, profile);
          const effectiveRole = await resolveEffectiveRole(profile.uuid, baseRole);
          setState({
            user: profile,
            role: effectiveRole,
            loading: false,
          });
        }
      } catch {
        if (mounted) setState({ user: null, role: null, loading: false });
      } finally {
        inFlight = false;
      }
    };

    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION' ||
        event === 'USER_UPDATED'
      ) {
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setState({ user: null, role: null, loading: false });
      }
    });

    const handleFocus = () => {
      loadProfile();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProfile();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return state;
}
