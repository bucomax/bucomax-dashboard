import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  PATIENT_PORTAL_OTP_MAX_REQUESTS_PER_WINDOW,
  PATIENT_PORTAL_OTP_REQUEST_WINDOW_MS,
  PATIENT_PORTAL_OTP_TTL_MS,
} from "@/lib/constants/patient-portal";
import { prisma } from "@/infrastructure/database/prisma";
import { getPatientPortalOtpHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail } from "@/infrastructure/email/resend.client";
import { notifyPatientPortalOtpByWebhook } from "@/infrastructure/notifications/patient-portal-otp-wpp";
import { findClientForPortalLogin } from "@/lib/patient-portal/find-client-by-portal-login";
import { digitsOnlyPhone } from "@/lib/validators/phone";
import { parsePortalLoginInput } from "@/lib/patient-portal/login-identifier";
import { findActiveTenantBySlug } from "@/lib/tenants/resolve-public-tenant";
import {
  generatePatientPortalOtpCode,
  hashPatientPortalOtpCode,
} from "@/lib/utils/patient-portal-otp";
import { postPatientPortalOtpRequestBodySchema } from "@/lib/validators/patient-portal";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ tenantSlug: string }> };

function jsonSuccessOpaque() {
  return jsonSuccess({ ok: true });
}

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const { tenantSlug: rawSlug } = await ctx.params;
  const tenantSlug = rawSlug.trim().toLowerCase();
  const tenant = await findActiveTenantBySlug(tenantSlug);
  if (!tenant) {
    return jsonSuccessOpaque();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPatientPortalOtpRequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const identifier = parsePortalLoginInput(parsed.data.login);
  if (!identifier) {
    return jsonError("VALIDATION_ERROR", apiT("errors.patientPortalLoginInvalid"), 422);
  }

  const client = await findClientForPortalLogin(tenant.id, identifier);

  if (!client) {
    return jsonSuccessOpaque();
  }

  const windowStart = new Date(Date.now() - PATIENT_PORTAL_OTP_REQUEST_WINDOW_MS);
  const recentCount = await prisma.patientPortalOtpChallenge.count({
    where: { clientId: client.id, createdAt: { gte: windowStart } },
  });
  if (recentCount >= PATIENT_PORTAL_OTP_MAX_REQUESTS_PER_WINDOW) {
    return jsonError("TOO_MANY_REQUESTS", apiT("errors.patientPortalOtpTooManyRequests"), 429);
  }

  const email = client.email?.trim() ?? "";
  const guardianEmail = client.isMinor ? (client.guardianEmail?.trim() ?? "") : "";
  const hasWebhook = Boolean(process.env.PATIENT_PORTAL_OTP_NOTIFY_URL?.trim());
  const phoneDigits = client.phone?.replace(/\D/g, "") ?? "";
  const guardianPhoneDigits = client.isMinor ? digitsOnlyPhone(client.guardianPhone ?? "") : "";
  const emailReady =
    isEmailConfigured() &&
    (Boolean(email) ||
      (client.isMinor &&
        Boolean(guardianEmail) &&
        guardianEmail.toLowerCase() !== email.toLowerCase()));
  const wppReady =
    hasWebhook &&
    (phoneDigits.length >= 10 || (client.isMinor && guardianPhoneDigits.length >= 10));

  if (!emailReady && !wppReady) {
    return jsonSuccessOpaque();
  }

  let code: string;
  let codeHash: string;
  try {
    code = generatePatientPortalOtpCode();
    codeHash = hashPatientPortalOtpCode(code);
  } catch {
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.patientPortalMisconfigured"), 503);
  }

  const expiresAt = new Date(Date.now() + PATIENT_PORTAL_OTP_TTL_MS);

  await prisma.patientPortalOtpChallenge.create({
    data: {
      clientId: client.id,
      tenantId: tenant.id,
      codeHash,
      expiresAt,
    },
  });

  const clinicName = tenant.name;

  if (emailReady) {
    const subject = `${clinicName} — Código do portal do paciente (Bucomax)`;
    const html = getPatientPortalOtpHtml({
      patientName: client.name,
      clinicName,
      code,
    });
    const text = `Olá, ${client.name}. Seu código Bucomax: ${code}. Válido por poucos minutos.`;
    const toList: string[] = [];
    if (email) toList.push(email);
    if (
      client.isMinor &&
      guardianEmail &&
      guardianEmail.toLowerCase() !== email.toLowerCase() &&
      !toList.some((x) => x.toLowerCase() === guardianEmail.toLowerCase())
    ) {
      toList.push(guardianEmail);
    }
    for (const to of toList) {
      const { error } = await sendEmail({ to, subject, html, text });
      if (error) {
        console.error("[patient-portal] OTP email failed:", error);
      }
    }
  }

  if (wppReady) {
    const text = `Bucomax (${clinicName}): seu código para acessar o portal é ${code}. Válido por poucos minutos.`;
    const phones: string[] = [];
    if (phoneDigits.length >= 10) phones.push(client.phone!.trim());
    if (
      client.isMinor &&
      guardianPhoneDigits.length >= 10 &&
      guardianPhoneDigits !== phoneDigits
    ) {
      phones.push(client.guardianPhone!.trim());
    }
    for (const phone of phones) {
      await notifyPatientPortalOtpByWebhook({ phone, text });
    }
  }

  return jsonSuccessOpaque();
}
