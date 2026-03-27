import { z } from "zod";

export const postFilePresignBodySchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200),
  clientId: z.string().cuid().optional(),
});

export const postFileRegisterBodySchema = z.object({
  key: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(500 * 1024 * 1024),
  clientId: z.string().cuid().optional(),
});
