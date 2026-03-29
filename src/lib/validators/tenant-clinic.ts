import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    },
    z.string().max(max).nullable(),
  );

export const patchTenantClinicBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  taxId: optionalTrimmedString(32).optional(),
  phone: optionalTrimmedString(32).optional(),
  addressLine: optionalTrimmedString(255).optional(),
  city: optionalTrimmedString(120).optional(),
  postalCode: optionalTrimmedString(32).optional(),
  affiliatedHospitals: optionalTrimmedString(10_000).optional(),
});
