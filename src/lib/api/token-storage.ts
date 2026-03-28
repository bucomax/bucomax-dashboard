/**
 * Armazenamento de tokens para **API JWT** (fase futura / clientes externos).
 * NextAuth (cookie) continua válido para o dashboard; quando existir `POST /api/v1/auth/refresh`,
 * os interceptors do axios usarão estes valores.
 */

const ACCESS_KEY = "bucomax_access_token";
const REFRESH_KEY = "bucomax_refresh_token";

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;

export function setAuthTokens(access: string | null, refresh: string | null): void {
  memoryAccess = access;
  memoryRefresh = refresh;
  if (typeof window === "undefined") return;
  if (access) localStorage.setItem(ACCESS_KEY, access);
  else localStorage.removeItem(ACCESS_KEY);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  else localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  if (memoryAccess) return memoryAccess;
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (memoryRefresh) return memoryRefresh;
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearAuthTokens(): void {
  setAuthTokens(null, null);
}
