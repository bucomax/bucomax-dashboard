import { AuditEventType, PatientPortalFileReviewStatus } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { findTenantClientVisibleToSession } from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { patchClientFileReviewBodySchema } from "@/lib/validators/patient-portal-files";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ clientId: string; fileId: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const { clientId, fileId } = await ctx.params;
  const { tenantId } = tenantCtx;
  const userId = auth.session!.user.id;

  const client = await findTenantClientVisibleToSession(auth.session!, tenantId, clientId, {
    id: true,
  });
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patchClientFileReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const asset = await prisma.fileAsset.findFirst({
    where: { id: fileId, clientId, tenantId },
    select: {
      id: true,
      mimeType: true,
      patientPortalReviewStatus: true,
    },
  });
  if (!asset) {
    return jsonError("NOT_FOUND", apiT("errors.clientFileNotFound"), 404);
  }

  if (asset.patientPortalReviewStatus !== PatientPortalFileReviewStatus.PENDING) {
    return jsonError("INVALID_STATE", apiT("errors.fileNotPendingPortalReview"), 409);
  }

  const nextStatus =
    parsed.data.decision === "approve"
      ? PatientPortalFileReviewStatus.APPROVED
      : PatientPortalFileReviewStatus.REJECTED;

  await prisma.$transaction(async (tx) => {
    await tx.fileAsset.update({
      where: { id: asset.id },
      data: { patientPortalReviewStatus: nextStatus },
    });
    await recordAuditEvent(tx, {
      tenantId,
      clientId,
      patientPathwayId: null,
      actorUserId: userId,
      type:
        parsed.data.decision === "approve"
          ? AuditEventType.PATIENT_PORTAL_FILE_APPROVED
          : AuditEventType.PATIENT_PORTAL_FILE_REJECTED,
      payload:
        parsed.data.decision === "approve"
          ? { fileAssetId: asset.id, mimeType: asset.mimeType }
          : {
              fileAssetId: asset.id,
              mimeType: asset.mimeType,
              ...(parsed.data.rejectReason?.trim()
                ? { rejectReason: parsed.data.rejectReason.trim() }
                : {}),
            },
    });
  });

  return jsonSuccess({
    fileId: asset.id,
    patientPortalReviewStatus: nextStatus,
  });
}
