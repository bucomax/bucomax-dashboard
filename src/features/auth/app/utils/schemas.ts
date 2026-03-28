import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export const adminInviteSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().max(120).optional(),
  tenantId: z.string().cuid(),
  role: z.enum(["tenant_admin", "tenant_user"]),
});

/** Formulário client (apenas `newPassword`; `token` vem da URL). */
export const setPasswordFormSchema = z.object({
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});
