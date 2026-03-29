import { AxiosError } from "axios";
import type { ApiErrorEnvelope } from "@/lib/api/envelope";

/** Locale simples para fallbacks quando não há `error.message` no JSON da API. */
function browserLocaleSeg(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.pathname.split("/").filter(Boolean)[0] ?? null;
}

function fallbackServerMessage(status?: number): string {
  const en = browserLocaleSeg() === "en";
  if (status != null && status >= 500) {
    return en
      ? "Server error. Please try again in a moment."
      : "Erro no servidor. Tente novamente em instantes.";
  }
  if (status === 401) {
    return en ? "Session expired or not signed in." : "Sessão expirada ou não autenticado.";
  }
  if (status === 403) {
    return en ? "You do not have permission for this action." : "Sem permissão para esta ação.";
  }
  if (status === 404) {
    return en ? "Resource not found." : "Recurso não encontrado.";
  }
  return en ? "Request failed. Please try again." : "Falha na requisição. Tente novamente.";
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; name?: string };
  return (
    e.code === "ERR_CANCELED" ||
    e.name === "CanceledError" ||
    e.message === "canceled" ||
    e.message === "Request aborted"
  );
}

/** Converte falha do axios (4xx/5xx com corpo `{ error.message }`) em `Error` legível. */
export function normalizeApiError(error: unknown): Error {
  if (isAbortError(error)) {
    return new Error("Request aborted");
  }
  if (error instanceof AxiosError) {
    const data = error.response?.data as Partial<ApiErrorEnvelope> | undefined;
    if (data?.error?.message) {
      return new Error(data.error.message);
    }
    const status = error.response?.status;
    if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      const en = browserLocaleSeg() === "en";
      return new Error(en ? "No connection. Check your network." : "Sem conexão. Verifique sua rede.");
    }
    if (error.message?.startsWith("Request failed with status code") || status != null) {
      return new Error(fallbackServerMessage(status));
    }
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}

/** Se o erro deve ser ignorado pelo toast global (ex.: abort). */
export function shouldSilenceApiErrorToast(error: unknown): boolean {
  return isAbortError(error);
}
