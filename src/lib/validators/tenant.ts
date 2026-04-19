import { z } from "zod";

export const tenantSlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: apenas minúsculas, números e hífens.");

const optionalTrimmed = z
  .union([z.string(), z.literal("")])
  .optional()
  .transform((v) => {
    const t = (v ?? "").trim();
    return t === "" ? undefined : t;
  });

export const postAdminTenantBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: tenantSlugSchema,
  taxId: optionalTrimmed.pipe(z.string().max(32).optional()),
  phone: optionalTrimmed.pipe(z.string().max(32).optional()),
  addressLine: optionalTrimmed.pipe(z.string().max(500).optional()),
  city: optionalTrimmed.pipe(z.string().max(200).optional()),
  postalCode: optionalTrimmed.pipe(z.string().max(32).optional()),
  admin: z
    .union([
      z.object({
        email: z.string().email(),
        name: z.union([z.string().max(120), z.literal("")]).optional(),
      }),
      z.null(),
    ])
    .optional()
    .transform((v) => {
      if (v == null) return undefined;
      const name = v.name?.trim();
      return { email: v.email.trim().toLowerCase(), ...(name ? { name } : {}) };
    }),
});

export const postAuthContextBodySchema = z.object({
  tenantId: z.string().cuid(),
});

export const patchAdminTenantBodySchema = z.object({
  isActive: z.boolean(),
});
