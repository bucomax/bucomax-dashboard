import bcrypt from "bcryptjs";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import { postPatientPortalSessionPasswordBodySchema } from "@/lib/validators/patient-portal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const portalCtx = await requireActivePatientPortalClient(request, apiT);
  if (!portalCtx.ok) return portalCtx.response;
  const portal = portalCtx.data.portal;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPatientPortalSessionPasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const { newPassword, currentPassword } = parsed.data;

  const row = await prisma.client.findFirst({
    where: { id: portal.clientId, tenantId: portal.tenantId, deletedAt: null },
    select: { id: true, portalPasswordHash: true },
  });
  if (!row) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  if (row.portalPasswordHash) {
    if (!currentPassword?.trim()) {
      return jsonError("VALIDATION_ERROR", apiT("errors.patientPortalPasswordCurrentRequired"), 422);
    }
    const match = await bcrypt.compare(currentPassword, row.portalPasswordHash);
    if (!match) {
      return jsonError("UNAUTHORIZED", apiT("errors.patientPortalPasswordCurrentWrong"), 401);
    }
  }

  const portalPasswordHash = await bcrypt.hash(newPassword, 12);
  const portalPasswordChangedAt = new Date();
  await prisma.client.update({
    where: { id: row.id },
    data: { portalPasswordHash, portalPasswordChangedAt },
  });

  await recordAuditEvent(prisma, {
    tenantId: portal.tenantId,
    clientId: row.id,
    patientPathwayId: null,
    actorUserId: null,
    type: AuditEventType.PATIENT_PORTAL_PASSWORD_SET,
    payload: { clientId: row.id, source: "portal_session" },
  });

  return jsonSuccess({ ok: true });
}
