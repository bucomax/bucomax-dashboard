import { AuditEventType, PatientPortalFileReviewStatus } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { findTenantClientVisibleToSession } from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { latestRejectReasonByFileAssetId } from "@/lib/clients/audit-portal-file-reject-reason";
import { clientDetailQuerySchema } from "@/lib/validators/client-detail-query";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ clientId: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const parsedQ = clientDetailQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsedQ.success) {
    return jsonError("VALIDATION_ERROR", parsedQ.error.flatten().formErrors.join("; "), 422);
  }
  const { page, limit } = parsedQ.data;
  const offset = (page - 1) * limit;

  const { clientId } = await ctx.params;

  const client = await findTenantClientVisibleToSession(auth.session!, tenantCtx.tenantId, clientId, {
    id: true,
  });
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const where = { tenantId: tenantCtx.tenantId, clientId };

  const [totalItems, rows] = await Promise.all([
    prisma.fileAsset.count({ where }),
    prisma.fileAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        sha256Hash: true,
        createdAt: true,
        patientPortalReviewStatus: true,
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const hasRejected = rows.some((r) => r.patientPortalReviewStatus === PatientPortalFileReviewStatus.REJECTED);
  const rejectReasonByFileId = hasRejected
    ? latestRejectReasonByFileAssetId(
        await prisma.auditEvent.findMany({
          where: {
            tenantId: tenantCtx.tenantId,
            clientId,
            type: AuditEventType.PATIENT_PORTAL_FILE_REJECTED,
          },
          orderBy: { createdAt: "desc" },
          select: { payload: true },
        }),
      )
    : new Map<string, string | null>();

  return jsonSuccess({
    data: rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      sha256Hash: r.sha256Hash,
      createdAt: r.createdAt.toISOString(),
      patientPortalReviewStatus: r.patientPortalReviewStatus,
      patientPortalRejectReason:
        r.patientPortalReviewStatus === PatientPortalFileReviewStatus.REJECTED
          ? (rejectReasonByFileId.get(r.id) ?? null)
          : null,
      uploadedBy: r.uploadedBy
        ? {
            id: r.uploadedBy.id,
            name: r.uploadedBy.name,
            email: r.uploadedBy.email,
          }
        : null,
    })),
    pagination: buildPagination(page, limit, totalItems),
  });
}
