import { randomUUID } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaStageDocumentReader = PrismaClient | Prisma.TransactionClient;

export type StageDocumentBundleItem = {
  stageDocumentId: string;
  sortOrder: number;
  file: {
    id: string;
    fileName: string;
    mimeType: string;
    r2Key: string;
  };
};

export async function getStageDocumentBundle(
  db: PrismaStageDocumentReader,
  pathwayStageId: string,
): Promise<StageDocumentBundleItem[]> {
  const rows = await db.stageDocument.findMany({
    where: { pathwayStageId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      sortOrder: true,
      fileAsset: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          r2Key: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    stageDocumentId: row.id,
    sortOrder: row.sortOrder,
    file: row.fileAsset,
  }));
}

export function buildStageDispatchStub(input: {
  tenantId: string;
  clientId: string;
  stageId: string;
  stageName: string;
  documents: StageDocumentBundleItem[];
}) {
  return {
    event: "patient.stage_changed",
    correlationId: randomUUID(),
    channel: "whatsapp_stub",
    dispatchStatus: "pending_stub",
    ...input,
  };
}
