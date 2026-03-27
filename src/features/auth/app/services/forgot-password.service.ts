import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@/shared/types/api/v1";

/**
 * `POST /api/v1/auth/forgot-password`
 */
export async function requestForgotPassword(
  email: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const res = await fetch("/api/v1/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const json = (await res.json().catch(() => null)) as
    | ApiSuccessEnvelope<{ message: string }>
    | ApiErrorEnvelope
    | null;

  if (!res.ok) {
    return {
      ok: false,
      message: json?.success === false ? json.error.message : "Erro ao solicitar.",
    };
  }

  return {
    ok: true,
    message:
      json?.success === true
        ? json.data.message
        : "Se o email existir, você receberá instruções.",
  };
}
