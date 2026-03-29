import { routing } from "@/i18n/routing";
import type {
  PublicPatientSelfRegisterRequestBody,
  PublicPatientSelfRegisterSubmitResponseData,
  PublicPatientSelfRegisterValidateResponseData,
} from "@/types/api/clients-v1";
import type { ApiEnvelope } from "@/shared/types/api/v1";

function acceptLanguageForPublicRequest(): string {
  if (typeof window === "undefined") return routing.defaultLocale;
  const seg = window.location.pathname.split("/").filter(Boolean)[0];
  if (seg === "en") return "en";
  if (seg === "pt-BR") return "pt-BR";
  return routing.defaultLocale;
}

export async function fetchPatientSelfRegisterValidation(
  token: string,
): Promise<PublicPatientSelfRegisterValidateResponseData> {
  const res = await fetch(
    `/api/v1/public/patient-self-register?token=${encodeURIComponent(token)}`,
    {
      headers: { "Accept-Language": acceptLanguageForPublicRequest() },
      cache: "no-store",
    },
  );
  const json = (await res.json()) as ApiEnvelope<PublicPatientSelfRegisterValidateResponseData>;
  if (!json.success || !json.data) {
    return { valid: false };
  }
  return json.data;
}

export async function submitPatientSelfRegister(
  body: PublicPatientSelfRegisterRequestBody,
): Promise<{ ok: true; data: PublicPatientSelfRegisterSubmitResponseData } | { ok: false; message: string }> {
  const res = await fetch("/api/v1/public/patient-self-register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": acceptLanguageForPublicRequest(),
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<PublicPatientSelfRegisterSubmitResponseData>;
  if (!json.success) {
    return { ok: false, message: json.error.message };
  }
  return { ok: true, data: json.data };
}
