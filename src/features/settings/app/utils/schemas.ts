import { z } from "zod";

export const inviteUserFormSchema = z.object({
  email: z.string().email("Email inválido."),
  name: z.string().max(120, "Máximo de 120 caracteres.").optional(),
  role: z.enum(["tenant_admin", "tenant_user"]),
});

export type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

export const profileFormSchema = z.object({
  name: z.string().min(1, "Informe o nome.").max(120),
  image: z.union([z.string().url("URL inválida."), z.literal("")]).optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(8, "Mínimo 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export const clinicSettingsFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da clínica.").max(120),
  taxId: z.string().max(32, "Máximo de 32 caracteres.").optional(),
  phone: z.string().max(32, "Máximo de 32 caracteres.").optional(),
  addressLine: z.string().max(255, "Máximo de 255 caracteres.").optional(),
  city: z.string().max(120, "Máximo de 120 caracteres.").optional(),
  postalCode: z.string().max(32, "Máximo de 32 caracteres.").optional(),
  affiliatedHospitals: z.string().max(10_000, "Máximo de 10000 caracteres.").optional(),
});

export type ClinicSettingsFormValues = z.infer<typeof clinicSettingsFormSchema>;

export const createTenantFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do tenant.").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Mínimo de 2 caracteres.")
    .max(64, "Máximo de 64 caracteres.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use minúsculas, números e hífens."),
});

export type CreateTenantFormValues = z.infer<typeof createTenantFormSchema>;
