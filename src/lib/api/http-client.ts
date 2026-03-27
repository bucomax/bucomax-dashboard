import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, getRefreshToken, setAuthTokens } from "@/lib/api/token-storage";
import type { ApiErrorEnvelope } from "@/types/api/v1";

/**
 * Cliente HTTP da aplicação (browser e futuros usos server com cuidado).
 * - `withCredentials`: cookies do NextAuth na mesma origem.
 * - `Authorization`: preenchido quando houver access JWT em `token-storage` (API stateless).
 */
export const apiClient = axios.create({
  baseURL:
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "")
      : "",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    const { data } = await axios.post<{ data?: { accessToken?: string; refreshToken?: string } }>(
      "/api/v1/auth/refresh",
      { refreshToken: rt },
      { headers: { "Content-Type": "application/json" }, withCredentials: true },
    );
    const access = data.data?.accessToken ?? null;
    const nextRefresh = data.data?.refreshToken ?? rt;
    if (access) setAuthTokens(access, nextRefresh);
    return access;
  } catch {
    setAuthTokens(null, null);
    return null;
  }
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

function requestHadBearer(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config?.headers) return false;
  const h = config.headers;
  const auth =
    typeof h.get === "function"
      ? h.get("Authorization")
      : (h as unknown as Record<string, string>).Authorization;
  return typeof auth === "string" && auth.startsWith("Bearer ");
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorEnvelope>) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      requestHadBearer(original) &&
      !(original as { _retry?: boolean })._retry
    ) {
      (original as { _retry?: boolean })._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccess = await refreshPromise;
      if (newAccess) {
        original.headers.set("Authorization", `Bearer ${newAccess}`);
        return apiClient(original);
      }
    }

    return Promise.reject(error);
  },
);
