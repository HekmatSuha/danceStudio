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

    const loadProfile = async () => {
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
      } catch (err) {
        if (mounted) setState({ user: null, role: null, loading: false });
      }
    };

    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setState({ user: null, role: null, loading: false });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
