import { z } from "zod";

export const tenantSlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: apenas minúsculas, números e hífens.");

export const postAdminTenantBodySchema = z.object({
  name: z.string().min(1).max(120),
  slug: tenantSlugSchema,
});

export const postAuthContextBodySchema = z.object({
  tenantId: z.string().cuid(),
});

export const patchAdminTenantBodySchema = z.object({
  isActive: z.boolean(),
});
