import { AuditEventType, Prisma, type PatientPortalFileReviewStatus } from "@prisma/client";

import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";
import { fileAssetPrismaRepository } from "@/infrastructure/repositories/file-asset.repository";
import { notificationEmitter } from "@/infrastructure/notifications/notification-emitter";
import {
  computeSha256HexForGcsObjectKey,
  keyMatchesFileRegisterIntent,
  publicUrlForKey,
  readFirstBytesFromGcsObject,
} from "@/infrastructure/storage/gcs-storage";
import { MAGIC_BYTES_READ_SIZE, validateMagicBytes } from "@/lib/utils/magic-bytes";
import type { ApiT } from "@/lib/api/i18n";
import { patientPortalFileRegisterBodySchema } from "@/lib/validators/patient-portal-files";
import type { z } from "zod";

export type PatientPortalFileRegisterInput = z.infer<typeof patientPortalFileRegisterBodySchema>;

export type RegisterPatientPortalFileResult =
  | {
      ok: true;
      file: {
        id: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        sha256Hash: string | null;
        patientPortalReviewStatus: PatientPortalFileReviewStatus;
        publicUrl: string | null;
        createdAt: string;
      };
    }
  | { ok: false; code: "INVALID_KEY" | "MIME_MISMATCH"; declaredMime?: string }
  | { ok: false; code: "CONFLICT" | "INTERNAL" };

export async function runRegisterPatientPortalFile(params: {
  tenantId: string;
  clientId: string;
  data: PatientPortalFileRegisterInput;
  /** i18n para notificação in-app */
  t: ApiT;
}): Promise<RegisterPatientPortalFileResult> {
  const { tenantId, clientId, data, t } = params;

  if (!keyMatchesFileRegisterIntent(data.key, tenantId, clientId)) {
    return { ok: false, code: "INVALID_KEY" };
  }

  try {
    try {
      const header = await readFirstBytesFromGcsObject(data.key, MAGIC_BYTES_READ_SIZE);
      if (header) {
        const mbResult = validateMagicBytes(header, data.mimeType);
        if (!mbResult.valid) {
          return { ok: false, code: "MIME_MISMATCH", declaredMime: mbResult.declaredMime };
        }
      }
    } catch {
      // GCS indisponível — fail-open
    }

    const sha256Hash = await computeSha256HexForGcsObjectKey(data.key);

    let asset: Awaited<ReturnType<typeof fileAssetPrismaRepository.createPatientPortalPendingAsset>>;
    try {
      asset = await fileAssetPrismaRepository.createPatientPortalPendingAsset({
        tenantId,
        clientId,
        r2Key: data.key,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        sha256Hash,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { ok: false, code: "CONFLICT" };
      }
      throw error;
    }

    await auditEventPrismaRepository.recordCanonical({
      tenantId,
      clientId,
      patientPathwayId: null,
      actorUserId: null,
      eventType: AuditEventType.PATIENT_PORTAL_FILE_SUBMITTED,
      payload: { fileAssetId: asset.id, mimeType: asset.mimeType },
    });

    const patientName =
      (await clientPrismaRepository.findClientNameById(tenantId, clientId)) ??
      t("notifications.patientPortalFallbackPatientName");

    notificationEmitter
      .emit({
        tenantId,
        type: "patient_portal_file_pending",
        title: t("notifications.patientPortalFileTitle"),
        body: t("notifications.patientPortalFileBody", {
          patientName,
          fileName: asset.fileName,
        }),
        metadata: { clientId, fileAssetId: asset.id },
        correlationId: asset.id,
      })
      .catch((err) => console.error("[registerPatientPortalFile] notification emit failed:", err));

    return {
      ok: true,
      file: {
        id: asset.id,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        sha256Hash: asset.sha256Hash,
        patientPortalReviewStatus: asset.patientPortalReviewStatus as PatientPortalFileReviewStatus,
        publicUrl: publicUrlForKey(asset.r2Key),
        createdAt: asset.createdAt.toISOString(),
      },
    };
  } catch (e) {
    console.error("[registerPatientPortalFile]", e);
    return { ok: false, code: "INTERNAL" };
  }
}
