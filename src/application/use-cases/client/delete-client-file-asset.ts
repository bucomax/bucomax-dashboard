import { AuditEventType } from "@prisma/client";

import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { fileAssetPrismaRepository } from "@/infrastructure/repositories/file-asset.repository";
import {
  deleteObjectFromBucket,
  isGcsConfigured,
  keyBelongsToTenant,
} from "@/infrastructure/storage/gcs-storage";

export type DeleteClientFileAssetResult =
  | { ok: true }
  | { ok: false; code: "FILE_NOT_FOUND" | "STORAGE_DELETE_FAILED" };

export async function runDeleteClientFileAsset(params: {
  tenantId: string;
  clientId: string;
  fileId: string;
  actorUserId: string;
}): Promise<DeleteClientFileAssetResult> {
  const { tenantId, clientId, fileId, actorUserId } = params;

  const asset = await fileAssetPrismaRepository.findForDeleteByClient(tenantId, clientId, fileId);
  if (!asset) {
    return { ok: false, code: "FILE_NOT_FOUND" };
  }

  if (isGcsConfigured() && keyBelongsToTenant(asset.r2Key, tenantId)) {
    try {
      await deleteObjectFromBucket(asset.r2Key);
    } catch {
      return { ok: false, code: "STORAGE_DELETE_FAILED" };
    }
  }

  await fileAssetPrismaRepository.deleteById(asset.id);

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId,
    patientPathwayId: null,
    actorUserId,
    eventType: AuditEventType.FILE_DELETED,
    payload: { fileAssetId: asset.id, userId: actorUserId },
  });

  return { ok: true };
}
