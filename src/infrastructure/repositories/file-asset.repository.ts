import { AuditEventType, PatientPortalFileReviewStatus, type Prisma } from "@prisma/client";

import type { CreateFileAssetInput, IFileAssetRepository } from "@/application/ports/file-asset-repository.port";
import { latestRejectReasonByFileAssetId } from "@/domain/file/audit-reject-reason-mapper";
import { recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { prisma } from "@/infrastructure/database/prisma";

function resolveClientId(input: CreateFileAssetInput): string | null {
  if (input.ownerType === "client") return input.ownerId;
  return null;
}

/** Chave única no storage (`r2Key`). Se `bucket` vier vazio, usa só `objectKey` (caminho completo). */
function resolveR2Key(input: CreateFileAssetInput): string {
  const bucket = input.bucket.trim();
  if (!bucket) return input.objectKey;
  return `${bucket.replace(/\/$/, "")}/${input.objectKey.replace(/^\//, "")}`;
}

export class FileAssetPrismaRepository implements IFileAssetRepository {
  async create(input: CreateFileAssetInput) {
    const row = await prisma.fileAsset.create({
      data: {
        tenantId: input.tenantId,
        r2Key: resolveR2Key(input),
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedById: input.uploadedByUserId ?? null,
        clientId: resolveClientId(input),
      },
      select: { id: true },
    });
    return row;
  }

  async findById(tenantId: string, fileAssetId: string) {
    return prisma.fileAsset.findFirst({
      where: { id: fileAssetId, tenantId },
    });
  }

  async findByKey(tenantId: string, objectKey: string) {
    return prisma.fileAsset.findFirst({
      where: { tenantId, r2Key: objectKey },
    });
  }

  async delete(tenantId: string, fileAssetId: string) {
    await prisma.fileAsset.deleteMany({
      where: { id: fileAssetId, tenantId },
    });
  }

  async findForStaffDownloadPresign(tenantId: string, fileId: string) {
    return prisma.fileAsset.findFirst({
      where: { id: fileId, tenantId },
      select: { id: true, r2Key: true, clientId: true },
    });
  }

  async findForDeleteByClient(tenantId: string, clientId: string, fileId: string) {
    return prisma.fileAsset.findFirst({
      where: { id: fileId, clientId, tenantId },
      select: { id: true, r2Key: true },
    });
  }

  async deleteById(fileAssetId: string) {
    await prisma.fileAsset.delete({ where: { id: fileAssetId } });
  }

  async findForPatientPortalDownload(tenantId: string, clientId: string, fileId: string) {
    const row = await prisma.fileAsset.findFirst({
      where: { id: fileId, tenantId, clientId },
      select: { id: true, r2Key: true, patientPortalReviewStatus: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      r2Key: row.r2Key,
      patientPortalReviewStatus: row.patientPortalReviewStatus,
    };
  }

  async createStaffUploadedAsset(params: {
    tenantId: string;
    userId: string;
    r2Key: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    clientId: string | null;
    sha256Hash: string | null;
  }) {
    return prisma.fileAsset.create({
      data: {
        tenantId: params.tenantId,
        r2Key: params.r2Key,
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        uploadedById: params.userId,
        clientId: params.clientId,
        sha256Hash: params.sha256Hash,
      },
      select: {
        id: true,
        r2Key: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        sha256Hash: true,
        clientId: true,
        createdAt: true,
      },
    });
  }

  async findForStaffPortalReview(tenantId: string, clientId: string, fileId: string) {
    return prisma.fileAsset.findFirst({
      where: { id: fileId, clientId, tenantId },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        patientPortalReviewStatus: true,
      },
    });
  }

  async applyPatientPortalFileReview(params: {
    tenantId: string;
    clientId: string;
    fileAssetId: string;
    nextStatus: string;
    actorUserId: string;
    auditEventType: string;
    auditPayload: unknown;
  }) {
    const { tenantId, clientId, fileAssetId, nextStatus, actorUserId, auditEventType, auditPayload } =
      params;
    const status = nextStatus as PatientPortalFileReviewStatus;
    const type = auditEventType as AuditEventType;
    await prisma.$transaction(async (tx) => {
      await tx.fileAsset.update({
        where: { id: fileAssetId },
        data: { patientPortalReviewStatus: status },
      });
      await recordAuditEvent(tx, {
        tenantId,
        clientId,
        patientPathwayId: null,
        actorUserId,
        type,
        payload: auditPayload as Prisma.InputJsonValue,
      });
    });
  }

  async listStaffClientFilesPage(params: {
    tenantId: string;
    clientId: string;
    page: number;
    limit: number;
  }) {
    const { tenantId, clientId, page, limit } = params;
    const offset = (page - 1) * limit;
    const where = { tenantId, clientId };

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

    const hasRejected = rows.some(
      (r) => r.patientPortalReviewStatus === PatientPortalFileReviewStatus.REJECTED,
    );
    const rejectReasonByFileId = hasRejected
      ? latestRejectReasonByFileAssetId(
          await prisma.auditEvent.findMany({
            where: {
              tenantId,
              clientId,
              type: AuditEventType.PATIENT_PORTAL_FILE_REJECTED,
            },
            orderBy: { createdAt: "desc" },
            select: { payload: true },
          }),
        )
      : new Map<string, string | null>();

    const data = rows.map((r) => ({
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
    }));

    return { totalItems, data };
  }

  async listPatientPortalFilesPage(params: {
    tenantId: string;
    clientId: string;
    page: number;
    limit: number;
  }) {
    const { tenantId, clientId, page, limit } = params;
    const offset = (page - 1) * limit;

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
          sha256Hash: true,
          createdAt: true,
          patientPortalReviewStatus: true,
        },
      }),
    ]);

    return { totalItems, rows };
  }

  async createPatientPortalPendingAsset(params: {
    tenantId: string;
    clientId: string;
    r2Key: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256Hash: string | null;
  }) {
    const row = await prisma.fileAsset.create({
      data: {
        tenantId: params.tenantId,
        r2Key: params.r2Key,
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        uploadedById: null,
        clientId: params.clientId,
        patientPortalReviewStatus: PatientPortalFileReviewStatus.PENDING,
        sha256Hash: params.sha256Hash,
      },
      select: {
        id: true,
        r2Key: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        sha256Hash: true,
        clientId: true,
        patientPortalReviewStatus: true,
        createdAt: true,
      },
    });
    return row;
  }
}

export const fileAssetPrismaRepository = new FileAssetPrismaRepository();
