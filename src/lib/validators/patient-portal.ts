import { z } from "zod";

import { zodApiMsg } from "@/lib/api/zod-i18n";
import { portalPasswordSchema } from "@/lib/validators/patient-portal-auth";

export const postPatientPortalExchangeBodySchema = z.object({
  token: z.string().min(1, "Token obrigatório."),
});

export const postClientPortalLinkBodySchema = z.object({
  sendEmail: z.boolean().optional(),
});

const portalLoginField = z.string().min(1).max(320);

/** CPF (11 dígitos) ou e-mail cadastrado na clínica. */
export const postPatientPortalOtpRequestBodySchema = z.object({
  login: portalLoginField,
});

export const postPatientPortalOtpVerifyBodySchema = z.object({
  login: portalLoginField,
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos."),
});

export const postPatientPortalLoginOptionsBodySchema = z.object({
  login: portalLoginField,
});

export const postPatientPortalPasswordVerifyBodySchema = z.object({
  login: portalLoginField,
  password: z.string().min(1).max(256),
});

/** `POST /api/v1/patient/password` — sessão do portal ativa. */
export const postPatientPortalSessionPasswordBodySchema = z
  .object({
    newPassword: portalPasswordSchema,
    confirmNewPassword: z.string(),
    currentPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmNewPassword"],
        message: zodApiMsg("errors.validationPortalPasswordMismatch"),
      });
    }
  });
