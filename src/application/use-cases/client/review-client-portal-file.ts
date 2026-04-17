import { AuditEventType, PatientPortalFileReviewStatus } from "@prisma/client";

import { fileAssetPrismaRepository } from "@/infrastructure/repositories/file-asset.repository";

export type ReviewClientPortalFileInput = {
  decision: "approve" | "reject";
  rejectReason?: string;
};

export type ReviewClientPortalFileResult =
  | {
      ok: true;
      fileId: string;
      fileName: string;
      patientPortalReviewStatus: PatientPortalFileReviewStatus;
    }
  | { ok: false; code: "FILE_NOT_FOUND" | "NOT_PENDING" };

export async function runReviewClientPortalFile(params: {
  tenantId: string;
  clientId: string;
  fileId: string;
  actorUserId: string;
  input: ReviewClientPortalFileInput;
}): Promise<ReviewClientPortalFileResult> {
  const { tenantId, clientId, fileId, actorUserId, input } = params;

  const asset = await fileAssetPrismaRepository.findForStaffPortalReview(tenantId, clientId, fileId);
  if (!asset) {
    return { ok: false, code: "FILE_NOT_FOUND" };
  }

  if (asset.patientPortalReviewStatus !== PatientPortalFileReviewStatus.PENDING) {
    return { ok: false, code: "NOT_PENDING" };
  }

  const nextStatus =
    input.decision === "approve"
      ? PatientPortalFileReviewStatus.APPROVED
      : PatientPortalFileReviewStatus.REJECTED;

  const auditPayload =
    input.decision === "approve"
      ? { fileAssetId: asset.id, mimeType: asset.mimeType }
      : {
          fileAssetId: asset.id,
          mimeType: asset.mimeType,
          ...(input.rejectReason?.trim() ? { rejectReason: input.rejectReason.trim() } : {}),
        };

  await fileAssetPrismaRepository.applyPatientPortalFileReview({
    tenantId,
    clientId,
    fileAssetId: asset.id,
    nextStatus,
    actorUserId,
    auditEventType:
      input.decision === "approve"
        ? AuditEventType.PATIENT_PORTAL_FILE_APPROVED
        : AuditEventType.PATIENT_PORTAL_FILE_REJECTED,
    auditPayload,
  });

  return {
    ok: true,
    fileId: asset.id,
    fileName: asset.fileName,
    patientPortalReviewStatus: nextStatus,
  };
}
