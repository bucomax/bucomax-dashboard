import { AuditEventType } from "@prisma/client";

import { patientPortalFileIsDownloadableByPatient } from "@/domain/file/patient-portal-file-access";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { fileAssetPrismaRepository } from "@/infrastructure/repositories/file-asset.repository";
import { presignGetObject } from "@/infrastructure/storage/gcs-storage";

const DOWNLOAD_URL_TTL_SECONDS = 300;

export type PresignPatientPortalFileDownloadResult =
  | { ok: true; downloadUrl: string; expiresInSeconds: number }
  | { ok: false; code: "NOT_FOUND" | "NOT_DOWNLOADABLE" };

export async function runPresignPatientPortalFileDownload(params: {
  tenantId: string;
  clientId: string;
  fileId: string;
}): Promise<PresignPatientPortalFileDownloadResult> {
  const { tenantId, clientId, fileId } = params;

  const asset = await fileAssetPrismaRepository.findForPatientPortalDownload(tenantId, clientId, fileId);
  if (!asset) {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (!patientPortalFileIsDownloadableByPatient(asset.patientPortalReviewStatus)) {
    return { ok: false, code: "NOT_DOWNLOADABLE" };
  }

  const downloadUrl = await presignGetObject(asset.r2Key, DOWNLOAD_URL_TTL_SECONDS);

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId,
    patientPathwayId: null,
    actorUserId: null,
    eventType: AuditEventType.FILE_DOWNLOADED_BY_PATIENT,
    payload: { fileAssetId: asset.id, clientId },
  });

  return {
    ok: true,
    downloadUrl,
    expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
  };
}
