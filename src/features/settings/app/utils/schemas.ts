import { z } from "zod";

export const inviteUserFormSchema = z.object({
  email: z.string().email("Email inválido."),
  name: z.string().max(120, "Máximo de 120 caracteres.").optional(),
  role: z.enum(["tenant_admin", "tenant_user"]),
});

export type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;
