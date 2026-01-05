"use client";

import useSWR from "swr";
import { supabase } from "./supabase";

async function fetchWithAuth<T>(url: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json() as Promise<T>;
}

export function useAuthedSWR<T>(key: string | null) {
  return useSWR<T>(key, fetchWithAuth, {
    revalidateOnFocus: false,
  });
}
