import { z } from "zod";

/** `PATCH /api/v1/patient/profile` — só dados pessoais. */
export const patchPatientPortalProfileBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().min(1).max(40).optional(),
  documentId: z.string().min(11).max(18).optional(),
});

export type PatchPatientPortalProfileBody = z.infer<typeof patchPatientPortalProfileBodySchema>;
