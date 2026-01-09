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
          setState({
            user: profile,
            role: toUserRole(profile.roles, profile),
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
