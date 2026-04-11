import { z } from "zod";

import { digitsOnlyCep } from "@/lib/validators/cep";

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

/** `PATCH /api/v1/patient/profile` — dados pessoais e endereço (sem `isMinor` / responsável). */
export const patchPatientPortalProfileBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().min(1).max(40).optional(),
  documentId: z.string().max(18).optional(),
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
});

export type PatchPatientPortalProfileBody = z.infer<typeof patchPatientPortalProfileBodySchema>;
