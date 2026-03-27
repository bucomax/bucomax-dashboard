import axios from "axios";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope, ApiErrorEnvelope } from "@/shared/types/api/v1";
import type { ResetPasswordRequest } from "../types/auth";

export type ResetPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * `POST /api/v1/auth/reset-password` — token na URL + nova senha (reset ou convite).
 */
export async function resetPasswordWithToken(body: ResetPasswordRequest): Promise<ResetPasswordResult> {
  try {
    const { data: envelope } = await apiClient.post<ApiEnvelope<{ message: string }>>(
      "/api/v1/auth/reset-password",
      body,
    );
    if (!envelope.success) {
      return { ok: false, message: envelope.error.message };
    }
    return { ok: true, message: envelope.data.message };
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.data) {
      const errBody = e.response.data as ApiErrorEnvelope;
      if (errBody.success === false) {
        return { ok: false, message: errBody.error.message };
      }
      return { ok: false, message: "Não foi possível concluir." };
    }
    return { ok: false, message: "Falha de rede. Tente novamente." };
  }
}
