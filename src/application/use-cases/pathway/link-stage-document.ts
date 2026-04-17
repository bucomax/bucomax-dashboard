import type { LinkStageDocumentResult } from "@/application/ports/pathway-repository.port";
import { pathwayPrismaRepository } from "@/infrastructure/repositories/pathway.repository";

export type { LinkStageDocumentResult };

export async function runLinkStageDocument(params: {
  tenantId: string;
  pathwayStageId: string;
  fileAssetId: string;
}): Promise<LinkStageDocumentResult> {
  return pathwayPrismaRepository.linkStageDocument(params);
}
