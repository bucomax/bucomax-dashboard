import { z } from "zod";

export const patientPortalFilePresignBodySchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200),
});

export const patientPortalFileRegisterBodySchema = z.object({
  key: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(500 * 1024 * 1024),
});

export const patientPortalFileDownloadPresignBodySchema = z.object({
  fileId: z.string().cuid(),
});

export const patchClientFileReviewBodySchema = z.object({
  decision: z.enum(["approve", "reject"]),
  rejectReason: z.string().max(500).optional(),
});
