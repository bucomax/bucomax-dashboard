import { prisma } from "@/infrastructure/database/prisma";
import { isGcsConfigured, presignGetObject } from "@/infrastructure/storage/gcs-storage";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireActivePatientPortalClient } from "@/lib/auth/patient-portal-request";
import { patientPortalFileIsDownloadableByPatient } from "@/lib/clients/patient-portal-file-access";
import { patientPortalFileDownloadPresignBodySchema } from "@/lib/validators/patient-portal-files";

export const dynamic = "force-dynamic";

const DOWNLOAD_URL_TTL_SECONDS = 300;

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  if (!isGcsConfigured()) {
    return jsonError("SERVICE_UNAVAILABLE", apiT("errors.storageNotConfigured"), 503);
  }

  const portalCtx = await requireActivePatientPortalClient(request, apiT);
  if (!portalCtx.ok) return portalCtx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patientPortalFileDownloadPresignBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { tenantId, clientId } = portalCtx.data.portal;

  const asset = await prisma.fileAsset.findFirst({
    where: { id: parsed.data.fileId, tenantId, clientId },
    select: { r2Key: true, patientPortalReviewStatus: true },
  });
  if (!asset) {
    return jsonError("NOT_FOUND", apiT("errors.fileNotFound"), 404);
  }

  if (!patientPortalFileIsDownloadableByPatient(asset.patientPortalReviewStatus)) {
    return jsonError("FORBIDDEN", apiT("errors.patientPortalFileNotAvailable"), 403);
  }

  const downloadUrl = await presignGetObject(asset.r2Key, DOWNLOAD_URL_TTL_SECONDS);

  return jsonSuccess({
    downloadUrl,
    expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
  });
}
