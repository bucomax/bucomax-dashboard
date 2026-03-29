import { z } from "zod";

export const postStageDocumentBodySchema = z.object({
  pathwayStageId: z.string().cuid(),
  fileAssetId: z.string().cuid(),
});
