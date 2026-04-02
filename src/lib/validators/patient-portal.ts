import { z } from "zod";

export const postPatientPortalExchangeBodySchema = z.object({
  token: z.string().min(1, "Token obrigatório."),
});

export const postClientPortalLinkBodySchema = z.object({
  sendEmail: z.boolean().optional(),
});
