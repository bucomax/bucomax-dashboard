import { z } from "zod";

export const postPathwayBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10_000).optional(),
});

export const patchPathwayBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10_000).nullable().optional(),
});

export const postPathwayVersionBodySchema = z.object({
  graphJson: z.any(),
});

export const patchPathwayVersionBodySchema = z.object({
  graphJson: z.any(),
});

export const postPatientPathwayBodySchema = z.object({
  clientId: z.string().cuid(),
  pathwayId: z.string().cuid(),
});

export const postStageTransitionBodySchema = z.object({
  toStageId: z.string().cuid(),
  note: z.string().max(2000).optional(),
});
