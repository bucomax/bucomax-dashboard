import { z } from "zod";

import { USER_PROFILE_IMAGE_GCS_PREFIX } from "@/lib/utils/user-profile-image-ref";

/** URL http(s) ou referência `gcs:{objectKey}` gravada após upload no bucket. */
export const profileImageStoredSchema = z.union([
  z.literal(""),
  z.null(),
  z.string().url(),
  z
    .string()
    .min(1)
    .max(600)
    .refine((s) => s.startsWith(USER_PROFILE_IMAGE_GCS_PREFIX), "INVALID_IMAGE_REF"),
]);

/** Formulário de perfil (sem `null`; vazio = remover foto). */
export const profileImageFormFieldSchema = z.union([
  z.literal(""),
  z.string().url("URL inválida."),
  z
    .string()
    .min(1)
    .max(600)
    .refine((s) => s.startsWith(USER_PROFILE_IMAGE_GCS_PREFIX), "Referência de imagem inválida."),
]);

export const patchMeBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  image: profileImageStoredSchema.optional(),
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
