import { z } from "zod";

export const patchMeBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  image: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: z.string().min(8, "Nova senha: mínimo 8 caracteres."),
});

export const patchMemberRoleBodySchema = z.object({
  role: z.enum(["tenant_admin", "tenant_user"]),
  restrictedToAssignedOnly: z.boolean().optional(),
  linkedOpmeSupplierId: z.union([z.string().cuid(), z.null()]).optional(),
});
