import { z } from "zod";

export const postOpmeSupplierBodySchema = z.object({
  name: z.string().min(1).max(200),
});

const trimmedSearch = z
  .string()
  .max(200)
  .optional()
  .transform((s) => {
    const t = s?.trim();
    return t && t.length > 0 ? t : undefined;
  });

export const opmeSuppliersListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  q: trimmedSearch,
  includeInactive: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});
