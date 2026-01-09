'use client';

import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

type Tokens = { access: string; refresh: string };
type RefreshResponse = { access: string; refresh?: string | null };
const TOKEN_KEY = "dancecrm.web.tokens";
const AUTH_EVENT = "dancecrm.auth.changed";

let tokenCache: Tokens | null = null;
let refreshPromise: Promise<string | null> | null = null;

function getStoredTokens(): Tokens | null {
  if (tokenCache) return tokenCache;
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  tokenCache = JSON.parse(raw) as Tokens;
  return tokenCache;
}

export function setTokens(tokens: Tokens) {
  tokenCache = tokens;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function clearTokens() {
  tokenCache = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

async function refreshAccess(): Promise<string | null> {
  const current = getStoredTokens();
  if (!current?.refresh) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: current.refresh,
        });
        const payload = res.data as RefreshResponse;
        const next: Tokens = {
          access: payload.access,
          refresh: payload.refresh ?? current.refresh,
        };
        setTokens(next);
        return next.access;
      } catch {
        clearTokens();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const tokens = getStoredTokens();
  if (tokens?.access) {
    config.headers = config.headers ?? {};
    if (!("Authorization" in config.headers)) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const access = await refreshAccess();
      if (access) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export { api, getStoredTokens, AUTH_EVENT };
