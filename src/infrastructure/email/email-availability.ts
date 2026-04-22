import { prisma } from "@/infrastructure/database/prisma";
import { isResendApiConfigured } from "@/infrastructure/email/resend-domain.client";

/**
 * Pode enviar e-mail com contexto de tenant (Resend e/ou SMTP, conforme modo).
 */
export async function canSendEmailForTenant(tenantId: string): Promise<boolean> {
  if (isResendApiConfigured()) {
    return true;
  }
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      emailOutboundMode: true,
      smtpHost: true,
      smtpUser: true,
      smtpPasswordEnc: true,
      smtpFromAddress: true,
    },
  });
  if (!t || t.emailOutboundMode !== "smtp") {
    return false;
  }
  return Boolean(
    t.smtpHost?.trim() && t.smtpUser?.trim() && t.smtpPasswordEnc && t.smtpFromAddress?.trim(),
  );
}
