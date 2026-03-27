import { AxiosError } from "axios";
import type { ApiErrorEnvelope } from "@/lib/api/envelope";

/** Converte falha do axios (4xx/5xx com corpo `{ error.message }`) em `Error` legível. */
export function normalizeApiError(error: unknown): Error {
  if (error instanceof AxiosError) {
    const data = error.response?.data as Partial<ApiErrorEnvelope> | undefined;
    if (data?.error?.message) {
      return new Error(data.error.message);
    }
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}
