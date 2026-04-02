import { AuditEventType, PatientPortalFileReviewStatus } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { keyBelongsToTenant, publicUrlForKey } from "@/infrastructure/storage/gcs-storage";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import { clientDetailQuerySchema } from "@/lib/validators/client-detail-query";
import { patientPortalFileRegisterBodySchema } from "@/lib/validators/patient-portal-files";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const portalCtx = await requireActivePatientPortalClient(apiT);
  if (!portalCtx.ok) return portalCtx.response;

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
  const { tenantId, clientId } = portalCtx.data.portal;

  const where = {
    tenantId,
    clientId,
    patientPortalReviewStatus: {
      in: [
        PatientPortalFileReviewStatus.NOT_APPLICABLE,
        PatientPortalFileReviewStatus.PENDING,
        PatientPortalFileReviewStatus.APPROVED,
      ],
    },
  };

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
        createdAt: true,
        patientPortalReviewStatus: true,
      },
    }),
  ]);

  return jsonSuccess({
    data: rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      createdAt: r.createdAt.toISOString(),
      patientPortalReviewStatus: r.patientPortalReviewStatus,
    })),
    pagination: buildPagination(page, limit, totalItems),
  });
}

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const portalCtx = await requireActivePatientPortalClient(apiT);
  if (!portalCtx.ok) return portalCtx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patientPortalFileRegisterBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { tenantId, clientId } = portalCtx.data.portal;

  if (!keyBelongsToTenant(parsed.data.key, tenantId)) {
    return jsonError("FORBIDDEN", apiT("errors.invalidObjectKey"), 403);
  }

  const existingKey = await prisma.fileAsset.findUnique({
    where: { r2Key: parsed.data.key },
    select: { id: true },
  });
  if (existingKey) {
    return jsonError("CONFLICT", apiT("errors.fileAlreadyRegistered"), 409);
  }

  const asset = await prisma.fileAsset.create({
    data: {
      tenantId,
      r2Key: parsed.data.key,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      uploadedById: null,
      clientId,
      patientPortalReviewStatus: PatientPortalFileReviewStatus.PENDING,
    },
    select: {
      id: true,
      r2Key: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      clientId: true,
      patientPortalReviewStatus: true,
      createdAt: true,
    },
  });

  await recordAuditEvent(prisma, {
    tenantId,
    clientId,
    patientPathwayId: null,
    actorUserId: null,
    type: AuditEventType.PATIENT_PORTAL_FILE_SUBMITTED,
    payload: { fileAssetId: asset.id, mimeType: asset.mimeType },
  });

  return jsonSuccess(
    {
      file: {
        id: asset.id,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        patientPortalReviewStatus: asset.patientPortalReviewStatus,
        publicUrl: publicUrlForKey(asset.r2Key),
        createdAt: asset.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
