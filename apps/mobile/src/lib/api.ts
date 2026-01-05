import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:3000/api/v1";

export type AuthTokens = {
  access: string;
  refresh: string;
};

type MaybeTokens = AuthTokens | null;

interface RetriableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

const TOKEN_KEY = "dancecrm.tokens";
let tokensCache: MaybeTokens = null;
let refreshPromise: Promise<string | null> | null = null;

async function readTokensFromStorage(): Promise<MaybeTokens> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

export async function getStoredTokens(): Promise<MaybeTokens> {
  if (!tokensCache) {
    tokensCache = await readTokensFromStorage();
  }
  return tokensCache;
}

export async function setTokens(tokens: AuthTokens) {
  tokensCache = tokens;
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearTokens() {
  tokensCache = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const current = await getStoredTokens();
  if (!current?.refresh) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: current.refresh,
        });
        const nextTokens: AuthTokens = {
          access: (res.data as AuthTokens).access,
          refresh: (res.data as AuthTokens).refresh ?? current.refresh,
        };
        await setTokens(nextTokens);
        return nextTokens.access;
      } catch {
        await clearTokens();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const tokens = await getStoredTokens();
  if (tokens?.access) {
    config.headers = config.headers ?? {};
    if (!("Authorization" in config.headers)) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetriableRequestConfig | undefined;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);
