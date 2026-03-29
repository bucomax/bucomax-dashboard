import { z } from "zod";

import { zodApiMsg } from "@/lib/api/zod-i18n";
import { digitsOnlyCpf } from "@/lib/validators/cpf";
import { digitsOnlyPhone, phoneDigitsSchema } from "@/lib/validators/phone";

/** E-mail opcional: omitido, null, "" ou só espaços → `undefined` (persistir como null). */
const optionalEmail = z.preprocess(
  (v) => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  },
  z.union([z.undefined(), z.string().max(320).email()]),
);

const postPhone = z.preprocess(
  (v) => (v == null ? "" : digitsOnlyPhone(String(v))),
  phoneDigitsSchema,
);

const patchPhone = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    if (v === null) return "";
    return digitsOnlyPhone(String(v));
  },
  z.union([z.undefined(), phoneDigitsSchema]),
);

/** CPF obrigatório no cadastro: exatamente 11 dígitos (após normalizar). */
const postDocumentId = z
  .preprocess(
    (v) => {
      if (v === undefined || v === null) return "";
      return String(v);
    },
    z.string().max(64),
  )
  .transform((s) => digitsOnlyCpf(s))
  .refine((d) => d.length > 0, { message: zodApiMsg("errors.validationCpfRequired") })
  .refine((d) => d.length === 11, { message: zodApiMsg("errors.validationCpf11Digits") });

export const postClientBodySchema = z.object({
  name: z.string().min(1).max(200),
  phone: postPhone,
  email: optionalEmail,
  caseDescription: z.string().max(20_000).optional(),
  documentId: postDocumentId,
  assignedToUserId: z.string().cuid().optional(),
  opmeSupplierId: z.string().cuid().optional(),
});

/** Cadastro público via link/QR (sem responsável nem OPME). */
export const publicPatientSelfRegisterBodySchema = postClientBodySchema
  .omit({ assignedToUserId: true, opmeSupplierId: true })
  .extend({
    token: z.string().min(1).max(128),
  });

const patchClientBodyBaseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: patchPhone,
  email: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const s = String(v).trim();
      return s === "" ? null : s;
    },
    z.union([z.undefined(), z.null(), z.string().email().max(320)]),
  ),
  caseDescription: z.string().max(20_000).nullable().optional(),
  documentId: z.union([z.null(), z.string()]).optional(),
  assignedToUserId: z.string().cuid().nullable().optional(),
  opmeSupplierId: z.string().cuid().nullable().optional(),
});

export const patchClientBodySchema = patchClientBodyBaseSchema.superRefine((data, ctx) => {
  if (data.documentId === undefined) return;
  if (data.documentId === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentId"],
      message: zodApiMsg("errors.validationCpfCannotRemove"),
    });
    return;
  }
  const d = digitsOnlyCpf(data.documentId);
  if (d.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentId"],
      message: zodApiMsg("errors.validationCpfRequired"),
    });
    return;
  }
  if (d.length !== 11) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentId"],
      message: zodApiMsg("errors.validationCpf11Digits"),
    });
  }
});
