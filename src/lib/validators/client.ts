import { z } from "zod";

import { zodApiMsg } from "@/lib/api/zod-i18n";
import { digitsOnlyCep } from "@/lib/validators/cep";
import { digitsOnlyCpf } from "@/lib/validators/cpf";
import { digitsOnlyPhone, phoneDigitsSchema } from "@/lib/validators/phone";

/** E-mail obrigatório na criação (formulário / POST); normaliza trim. */
const requiredEmail = z.preprocess(
  (v) => (v == null ? "" : String(v).trim()),
  z
    .string()
    .min(1, { message: zodApiMsg("errors.validationEmailRequired") })
    .max(320)
    .email({ message: zodApiMsg("errors.validationEmailInvalid") }),
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

function trimOpt(max: number) {
  return z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().min(1).max(max).optional(),
  );
}

const addressFieldsCreate = {
  postalCode: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      const d = digitsOnlyCep(String(v));
      return d === "" ? undefined : d;
    },
    z.union([z.undefined(), z.string().length(8)]),
  ),
  addressLine: trimOpt(500),
  addressNumber: trimOpt(64),
  addressComp: trimOpt(120),
  neighborhood: trimOpt(200),
  city: trimOpt(200),
  state: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      const s = String(v).trim().toUpperCase();
      return s === "" ? undefined : s;
    },
    z.union([z.undefined(), z.string().length(2)]),
  ),
};

const guardianFieldsCreate = {
  guardianName: trimOpt(200),
  guardianDocumentId: z.preprocess(
    (v) => (v === undefined || v === null ? undefined : String(v)),
    z.union([z.undefined(), z.string().max(64)]),
  ),
  guardianPhone: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      const d = digitsOnlyPhone(String(v));
      return d === "" ? undefined : d;
    },
    z.union([z.undefined(), phoneDigitsSchema]),
  ),
};

const documentIdRawForCreate = z.preprocess(
  (v) => (v === undefined || v === null ? "" : String(v)),
  z.string().max(64),
);

const clientCreateObject = z.object({
  name: z.string().min(1).max(200),
  phone: postPhone,
  email: requiredEmail,
  caseDescription: z.string().max(20_000).optional(),
  documentId: documentIdRawForCreate,
  assignedToUserId: z.string().cuid().optional(),
  opmeSupplierId: z.string().cuid().optional(),
  isMinor: z.boolean().default(false),
  ...addressFieldsCreate,
  ...guardianFieldsCreate,
});

function refineMinorGuardianCpf(
  data: {
    isMinor: boolean;
    documentId: string;
    guardianName?: string | undefined;
    guardianDocumentId?: string | undefined;
  },
  ctx: z.RefinementCtx,
) {
  const doc = digitsOnlyCpf(data.documentId);
  if (data.isMinor) {
    if (!data.guardianName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianName"],
        message: zodApiMsg("errors.validationGuardianNameRequired"),
      });
    }
    const gDoc = digitsOnlyCpf(data.guardianDocumentId ?? "");
    if (gDoc.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianDocumentId"],
        message: zodApiMsg("errors.validationGuardianCpfRequired"),
      });
    }
    if (doc.length > 0 && doc.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documentId"],
        message: zodApiMsg("errors.validationCpf11Digits"),
      });
    }
  } else {
    if (doc.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documentId"],
        message: zodApiMsg("errors.validationCpfRequired"),
      });
    } else if (doc.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documentId"],
        message: zodApiMsg("errors.validationCpf11Digits"),
      });
    }
  }
}

export type ClientCreateNormalized = {
  name: string;
  phone: string;
  email: string;
  caseDescription: string | null;
  documentId: string | null;
  assignedToUserId: string | null;
  opmeSupplierId: string | null;
  isMinor: boolean;
  postalCode: string | null;
  addressLine: string | null;
  addressNumber: string | null;
  addressComp: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  guardianName: string | null;
  guardianDocumentId: string | null;
  guardianPhone: string | null;
};

function normalizeClientCreatePayload(
  data: z.infer<typeof clientCreateObject>,
): ClientCreateNormalized {
  const doc = digitsOnlyCpf(data.documentId);
  const gPhone = data.guardianPhone;
  return {
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    caseDescription: data.caseDescription?.trim() || null,
    documentId: data.isMinor && doc.length === 0 ? null : doc,
    assignedToUserId: data.assignedToUserId ?? null,
    opmeSupplierId: data.opmeSupplierId ?? null,
    isMinor: data.isMinor,
    postalCode: data.postalCode ?? null,
    addressLine: data.addressLine ?? null,
    addressNumber: data.addressNumber ?? null,
    addressComp: data.addressComp ?? null,
    neighborhood: data.neighborhood ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    guardianName: data.isMinor ? data.guardianName!.trim() : null,
    guardianDocumentId: data.isMinor ? digitsOnlyCpf(data.guardianDocumentId!) : null,
    guardianPhone: data.isMinor && gPhone && gPhone.length > 0 ? gPhone : null,
  };
}

export const postClientBodySchema = clientCreateObject
  .superRefine((data, ctx) => refineMinorGuardianCpf(data, ctx))
  .transform((data) => normalizeClientCreatePayload(data));

const publicPatientSelfRegisterObject = clientCreateObject
  .omit({ assignedToUserId: true, opmeSupplierId: true })
  .extend({
    token: z.string().min(1).max(128),
  });

/** Formulário público (sem `token`; validação alinhada ao POST com token). */
export const patientSelfRegisterFormSchema = clientCreateObject
  .omit({ assignedToUserId: true, opmeSupplierId: true })
  .superRefine((data, ctx) => refineMinorGuardianCpf(data, ctx));

/** Cadastro público via link/QR (sem responsável nem OPME). */
export const publicPatientSelfRegisterBodySchema = publicPatientSelfRegisterObject
  .superRefine((data, ctx) => {
    const { token: _token, ...rest } = data;
    void _token;
    refineMinorGuardianCpf(rest, ctx);
  })
  .transform((data) => {
    const { token, ...rest } = data;
    return { ...normalizeClientCreatePayload(rest), token };
  });

/** Corpo opcional de `POST /api/v1/clients/self-register-invites` (convite genérico ou ligado a um paciente). */
export const postPatientSelfRegisterInviteBodySchema = z.object({
  clientId: z.string().cuid().optional(),
});

function nullableTrimmed(max: number) {
  return z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const s = String(v).trim();
      return s === "" ? null : s;
    },
    z.union([z.undefined(), z.null(), z.string().max(max)]),
  );
}

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
  isMinor: z.boolean().optional(),
  postalCode: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const d = digitsOnlyCep(String(v));
      return d === "" ? null : d;
    },
    z.union([z.undefined(), z.null(), z.string().length(8)]),
  ).optional(),
  addressLine: nullableTrimmed(500).optional(),
  addressNumber: nullableTrimmed(64).optional(),
  addressComp: nullableTrimmed(120).optional(),
  neighborhood: nullableTrimmed(200).optional(),
  city: nullableTrimmed(200).optional(),
  state: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const s = String(v).trim().toUpperCase();
      return s === "" ? null : s;
    },
    z.union([z.undefined(), z.null(), z.string().length(2)]),
  ).optional(),
  guardianName: nullableTrimmed(200).optional(),
  guardianDocumentId: z.union([z.null(), z.string()]).optional(),
  guardianPhone: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const d = digitsOnlyPhone(String(v));
      return d === "" ? null : d;
    },
    z.union([z.undefined(), z.null(), phoneDigitsSchema]),
  ).optional(),
});

export const patchClientBodySchema = patchClientBodyBaseSchema.superRefine((data, ctx) => {
  if (data.documentId !== undefined && data.documentId !== null) {
    const d = digitsOnlyCpf(data.documentId);
    if (d.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documentId"],
        message: zodApiMsg("errors.validationCpfRequired"),
      });
    } else if (d.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documentId"],
        message: zodApiMsg("errors.validationCpf11Digits"),
      });
    }
  }
  if (data.documentId === null && data.isMinor !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentId"],
      message: zodApiMsg("errors.validationCpfCannotRemove"),
    });
  }
  if (data.isMinor === true) {
    const gName = data.guardianName;
    if (gName === undefined || gName === null || String(gName).trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianName"],
        message: zodApiMsg("errors.validationGuardianNameRequired"),
      });
    }
    const gRaw = data.guardianDocumentId;
    if (gRaw === undefined || gRaw === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianDocumentId"],
        message: zodApiMsg("errors.validationGuardianCpfRequired"),
      });
    } else {
      const g = digitsOnlyCpf(gRaw);
      if (g.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianDocumentId"],
          message: zodApiMsg("errors.validationCpf11Digits"),
        });
      }
    }
  }
});
