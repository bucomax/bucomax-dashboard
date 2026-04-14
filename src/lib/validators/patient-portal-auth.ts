import { z } from "zod";

import { zodApiMsg } from "@/lib/api/zod-i18n";

/** Alinhado ao plano: caracteres especiais permitidos na senha do portal. */
const portalPasswordSpecialCharsRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export const portalPasswordSchema = z
  .string()
  .min(8, { message: zodApiMsg("errors.validationPortalPasswordMin") })
  .regex(/[A-Z]/, { message: zodApiMsg("errors.validationPortalPasswordUppercase") })
  .regex(/[a-z]/, { message: zodApiMsg("errors.validationPortalPasswordLowercase") })
  .regex(/[0-9]/, { message: zodApiMsg("errors.validationPortalPasswordDigit") })
  .regex(portalPasswordSpecialCharsRegex, {
    message: zodApiMsg("errors.validationPortalPasswordSpecial"),
  });

export type PortalPasswordRuleChecks = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  digit: boolean;
  special: boolean;
};

export function getPortalPasswordRuleChecks(password: string): PortalPasswordRuleChecks {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: portalPasswordSpecialCharsRegex.test(password),
  };
}

export function isPortalPasswordStrong(checks: PortalPasswordRuleChecks): boolean {
  return (
    checks.minLength &&
    checks.uppercase &&
    checks.lowercase &&
    checks.digit &&
    checks.special
  );
}

/** Formulário de auto-cadastro: senha forte e confirmação igual. */
export function isPortalSelfRegisterPasswordComplete(
  password: string,
  confirmPassword: string,
): boolean {
  if (!password || !confirmPassword) return false;
  return (
    isPortalPasswordStrong(getPortalPasswordRuleChecks(password)) && password === confirmPassword
  );
}
