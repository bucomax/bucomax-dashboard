import type { z } from "zod";
import { forgotPasswordSchema, loginSchema, setPasswordFormSchema } from "../utils/schemas";

export type LoginFormValues = z.infer<typeof loginSchema>;

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export type SetPasswordFormValues = z.infer<typeof setPasswordFormSchema>;

/** Body de `POST /api/v1/auth/reset-password`. */
export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};
