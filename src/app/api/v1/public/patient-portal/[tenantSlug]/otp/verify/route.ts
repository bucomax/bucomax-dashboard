import { createApiMeta } from "@/lib/api/envelope";
import { getApiT } from "@/lib/api/i18n";
import { jsonError } from "@/lib/api-response";
import {
  appendPatientPortalSessionCookie,
  type PatientPortalSessionPayload,
  portalPasswordVersionMs,
} from "@/lib/auth/patient-portal-session";
import {
  PATIENT_PORTAL_OTP_MAX_ATTEMPTS,
  PATIENT_PORTAL_SESSION_MAX_AGE_SEC,
} from "@/lib/constants/patient-portal";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { prisma } from "@/infrastructure/database/prisma";
import { findClientForPortalLogin } from "@/lib/patient-portal/find-client-by-portal-login";
import { parsePortalLoginInput } from "@/lib/patient-portal/login-identifier";
import { findActiveTenantBySlug } from "@/lib/tenants/resolve-public-tenant";
import { hashPatientPortalOtpCode } from "@/lib/utils/patient-portal-otp";
import { postPatientPortalOtpVerifyBodySchema } from "@/lib/validators/patient-portal";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ tenantSlug: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const { tenantSlug: rawSlug } = await ctx.params;
  const tenantSlug = rawSlug.trim().toLowerCase();
  const tenant = await findActiveTenantBySlug(tenantSlug);
  if (!tenant) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalOtpInvalid"), 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPatientPortalOtpVerifyBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const identifier = parsePortalLoginInput(parsed.data.login);
  if (!identifier) {
    return jsonError("VALIDATION_ERROR", apiT("errors.patientPortalLoginInvalid"), 422);
  }

  const client = await findClientForPortalLogin(tenant.id, identifier);
  if (!client) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalOtpInvalid"), 401);
  }

  const challenge = await prisma.patientPortalOtpChallenge.findFirst({
    where: {
      clientId: client.id,
      tenantId: tenant.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalOtpInvalid"), 401);
  }

  if (challenge.attempts >= PATIENT_PORTAL_OTP_MAX_ATTEMPTS) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalOtpInvalid"), 401);
  }

  const expectedHash = hashPatientPortalOtpCode(parsed.data.code);
  if (expectedHash !== challenge.codeHash) {
    await prisma.patientPortalOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalOtpInvalid"), 401);
  }

  await prisma.patientPortalOtpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  const exp = Math.floor(Date.now() / 1000) + PATIENT_PORTAL_SESSION_MAX_AGE_SEC;
  const sessionPayload: PatientPortalSessionPayload = {
    clientId: client.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    exp,
    pwdv: portalPasswordVersionMs(client.portalPasswordChangedAt),
  };

  try {
    const res = NextResponse.json({
      success: true,
      data: { ok: true },
      meta: createApiMeta(),
    });
    appendPatientPortalSessionCookie(res, sessionPayload);
    await recordAuditEvent(prisma, {
      tenantId: tenant.id,
      clientId: client.id,
      patientPathwayId: null,
      actorUserId: null,
      type: AuditEventType.PATIENT_PORTAL_SESSION_CREATED,
      payload: { clientId: client.id, method: "otp" },
    });
    return res;
  } catch (e) {
    console.error("[patient-portal] OTP session cookie signing failed:", e);
    return jsonError(
      "SERVICE_UNAVAILABLE",
      apiT("errors.patientPortalMisconfigured"),
      503,
    );
  }
}
