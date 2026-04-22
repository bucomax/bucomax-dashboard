/**
 * Envio transacional (Resend API e/ou SMTP por tenant) e helpers de URL.
 */

import { getPublicAppUrl } from "@/lib/config/urls";

export { sendEmail } from "@/infrastructure/email/transactional-mail.client";

/** E-mail da plataforma pode ser enviado (chave Resend no ambiente). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const appUrl = () => getPublicAppUrl().replace(/\/$/, "");

export function buildResetPasswordUrl(token: string): string {
  return `${appUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

export function buildInviteSetPasswordUrl(token: string): string {
  return `${appUrl()}/auth/invite?token=${encodeURIComponent(token)}`;
}

export function buildPatientSelfRegisterUrl(token: string, tenantSlug: string): string {
  const slug = tenantSlug.trim();
  return `${appUrl()}/${encodeURIComponent(slug)}/patient-self-register?token=${encodeURIComponent(token)}`;
}
