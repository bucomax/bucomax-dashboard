import type { CreatePathwayVersionDraftResult } from "@/application/ports/pathway-repository.port";
import { pathwayPrismaRepository } from "@/infrastructure/repositories/pathway.repository";
import { postPathwayVersionBodySchema } from "@/lib/validators/pathway";
import type { z } from "zod";

export type CreatePathwayVersionDraftInput = z.infer<typeof postPathwayVersionBodySchema>;

export type { CreatePathwayVersionDraftResult };

export async function runCreatePathwayVersionDraft(params: {
  tenantId: string;
  pathwayId: string;
  data: CreatePathwayVersionDraftInput;
}): Promise<CreatePathwayVersionDraftResult> {
  const { tenantId, pathwayId, data } = params;
  return pathwayPrismaRepository.createPathwayVersionDraft({
    tenantId,
    pathwayId,
    graphJson: data.graphJson,
  });
}
