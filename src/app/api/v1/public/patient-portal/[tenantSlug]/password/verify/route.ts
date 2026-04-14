import bcrypt from "bcryptjs";
import { createApiMeta } from "@/lib/api/envelope";
import { getApiT } from "@/lib/api/i18n";
import { jsonError } from "@/lib/api-response";
import { rateLimit } from "@/lib/api/rate-limit";
import {
  appendPatientPortalSessionCookie,
  type PatientPortalSessionPayload,
  portalPasswordVersionMs,
} from "@/lib/auth/patient-portal-session";
import { PATIENT_PORTAL_SESSION_MAX_AGE_SEC } from "@/lib/constants/patient-portal";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { prisma } from "@/infrastructure/database/prisma";
import { findClientForPortalLogin } from "@/lib/patient-portal/find-client-by-portal-login";
import {
  parsePortalLoginInput,
  portalLoginRateKey,
} from "@/lib/patient-portal/login-identifier";
import { findActiveTenantBySlug } from "@/lib/tenants/resolve-public-tenant";
import { postPatientPortalPasswordVerifyBodySchema } from "@/lib/validators/patient-portal";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ tenantSlug: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const { tenantSlug: rawSlug } = await ctx.params;
  const tenantSlug = rawSlug.trim().toLowerCase();
  const tenant = await findActiveTenantBySlug(tenantSlug);
  if (!tenant) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalPasswordInvalid"), 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPatientPortalPasswordVerifyBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const identifier = parsePortalLoginInput(parsed.data.login);
  if (!identifier) {
    return jsonError("VALIDATION_ERROR", apiT("errors.patientPortalLoginInvalid"), 422);
  }

  const limited = await rateLimit(
    "patientPortalPassword",
    `pp-login-pw:${tenant.id}:${portalLoginRateKey(identifier)}`,
  );
  if (limited) return limited;

  const client = await findClientForPortalLogin(tenant.id, identifier);

  if (!client) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalPasswordInvalid"), 401);
  }

  if (!client.portalPasswordHash) {
    void recordAuditEvent(prisma, {
      tenantId: tenant.id,
      clientId: client.id,
      patientPathwayId: null,
      actorUserId: null,
      type: AuditEventType.PATIENT_PORTAL_LOGIN_FAILED,
      payload: { reason: "password_not_set" },
    }).catch(() => {});
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalPasswordInvalid"), 401);
  }

  const ok = await bcrypt.compare(parsed.data.password, client.portalPasswordHash);
  if (!ok) {
    void recordAuditEvent(prisma, {
      tenantId: tenant.id,
      clientId: client.id,
      patientPathwayId: null,
      actorUserId: null,
      type: AuditEventType.PATIENT_PORTAL_LOGIN_FAILED,
      payload: { reason: "invalid_password" },
    }).catch(() => {});
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalPasswordInvalid"), 401);
  }

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
      payload: { clientId: client.id, method: "password" },
    });
    return res;
  } catch (e) {
    console.error("[patient-portal] password session cookie signing failed:", e);
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.patientPortalMisconfigured"), 503);
  }
}
