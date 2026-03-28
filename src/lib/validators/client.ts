import { z } from "zod";

export const postClientBodySchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(8).max(32),
  caseDescription: z.string().max(20_000).optional(),
  documentId: z.string().min(1).max(64),
});

export const patchClientBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(8).max(32).optional(),
  caseDescription: z.string().max(20_000).nullable().optional(),
  documentId: z.string().max(64).nullable().optional(),
});
