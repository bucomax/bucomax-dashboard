import { createHmac, randomInt } from "crypto";

function otpSigningSecret(): string {
  const s =
    process.env.PATIENT_PORTAL_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!s) {
    throw new Error("Defina PATIENT_PORTAL_SECRET ou NEXTAUTH_SECRET para OTP do portal.");
  }
  return s;
}

export function generatePatientPortalOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashPatientPortalOtpCode(code: string): string {
  return createHmac("sha256", otpSigningSecret()).update(`patient-portal-otp:${code}`, "utf8").digest("hex");
}
