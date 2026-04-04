import { createApiMeta } from "@/lib/api/envelope";
import { getApiT } from "@/lib/api/i18n";
import { jsonError } from "@/lib/api-response";
import {
  appendPatientPortalSessionCookie,
  type PatientPortalSessionPayload,
} from "@/lib/auth/patient-portal-session";
import { PATIENT_PORTAL_SESSION_MAX_AGE_SEC } from "@/lib/constants/patient-portal";
import { prisma } from "@/infrastructure/database/prisma";
import { findActiveTenantBySlug } from "@/lib/tenants/resolve-public-tenant";
import { postPatientPortalExchangeBodySchema } from "@/lib/validators/patient-portal";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ tenantSlug: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const { tenantSlug: rawSlug } = await ctx.params;
  const tenantSlug = rawSlug.trim().toLowerCase();
  const tenant = await findActiveTenantBySlug(tenantSlug);
  if (!tenant) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPatientPortalExchangeBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const row = await prisma.patientPortalLinkToken.findUnique({
    where: { token: parsed.data.token },
    include: {
      client: { select: { id: true, tenantId: true, deletedAt: true } },
    },
  });

  const now = new Date();
  if (
    !row ||
    row.expiresAt < now ||
    row.client.deletedAt != null ||
    row.client.tenantId !== tenant.id
  ) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalInvalidToken"), 401);
  }

  if (row.singleUse && row.usedAt != null) {
    return jsonError("UNAUTHORIZED", apiT("errors.patientPortalInvalidToken"), 401);
  }

  if (row.singleUse) {
    await prisma.patientPortalLinkToken.update({
      where: { id: row.id },
      data: { usedAt: now },
    });
  }

  const exp = Math.floor(Date.now() / 1000) + PATIENT_PORTAL_SESSION_MAX_AGE_SEC;
  const sessionPayload: PatientPortalSessionPayload = {
    clientId: row.clientId,
    tenantId: row.client.tenantId,
    tenantSlug: tenant.slug,
    exp,
  };

  try {
    const res = NextResponse.json({
      success: true,
      data: { ok: true },
      meta: createApiMeta(),
    });
    appendPatientPortalSessionCookie(res, sessionPayload);
    return res;
  } catch (e) {
    console.error("[patient-portal] session cookie signing failed:", e);
    return jsonError(
      "SERVICE_UNAVAILABLE",
      apiT("errors.patientPortalMisconfigured"),
      503,
    );
  }
}
