import { z } from "zod";

export const postPatientPortalExchangeBodySchema = z.object({
  token: z.string().min(1, "Token obrigatório."),
});

export const postClientPortalLinkBodySchema = z.object({
  sendEmail: z.boolean().optional(),
});

export const postPatientPortalOtpRequestBodySchema = z.object({
  documentId: z.string().min(1, "documentId obrigatório."),
});

export const postPatientPortalOtpVerifyBodySchema = z.object({
  documentId: z.string().min(1, "documentId obrigatório."),
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos."),
});
