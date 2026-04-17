import { randomBytes } from "crypto";
import { AuditEventType } from "@prisma/client";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { patientPortalLinkTokenPrismaRepository } from "@/infrastructure/repositories/patient-portal-link-token.repository";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";
import { getPatientPortalMagicLinkHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail } from "@/infrastructure/email/resend.client";
import { getPublicAppUrl } from "@/lib/config/urls";
import { PATIENT_PORTAL_LINK_TTL_MS } from "@/lib/constants/patient-portal";
import type { PostClientPortalLinkResponse } from "@/types/api/patient-portal-v1";

export type CreateClientPortalLinkResult =
  | { ok: true; data: PostClientPortalLinkResponse }
  | {
      ok: false;
      code: "TENANT_SLUG_MISSING" | "EMAIL_NOT_CONFIGURED" | "EMAIL_SEND_FAILED";
    };

export async function runCreateClientPortalLink(params: {
  tenantId: string;
  actorUserId: string;
  client: { id: string; name: string; email: string | null };
  sendEmailFlag: boolean;
}): Promise<CreateClientPortalLinkResult> {
  const { tenantId, actorUserId, client, sendEmailFlag } = params;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PATIENT_PORTAL_LINK_TTL_MS);
  const singleUse = sendEmailFlag;

  const tokenRow = await patientPortalLinkTokenPrismaRepository.createPortalLinkToken({
    clientId: client.id,
    token,
    expiresAt,
    singleUse,
  });

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId: client.id,
    patientPathwayId: null,
    actorUserId,
    eventType: AuditEventType.PATIENT_PORTAL_LINK_GENERATED,
    payload: {
      tokenId: tokenRow.id,
      singleUse,
      ttlMs: PATIENT_PORTAL_LINK_TTL_MS,
    },
  });

  const tenant = await tenantPrismaRepository.findTenantNameAndSlugById(tenantId);
  const clinicName = tenant?.name ?? "Clínica";
  const tenantSlug = tenant?.slug ?? "";
  if (!tenantSlug) {
    return { ok: false, code: "TENANT_SLUG_MISSING" };
  }

  const enterUrl = `${getPublicAppUrl()}/${tenantSlug}/patient/enter?token=${encodeURIComponent(token)}`;

  let emailSent = false;
  const email = client.email?.trim() ?? "";
  if (sendEmailFlag && email) {
    if (!isEmailConfigured()) {
      return { ok: false, code: "EMAIL_NOT_CONFIGURED" };
    }

    const { error } = await sendEmail({
      to: email,
      subject: `${clinicName} — Acesso ao seu acompanhamento (Bucomax)`,
      html: getPatientPortalMagicLinkHtml({
        patientName: client.name,
        clinicName,
        enterUrl,
        singleUse,
      }),
      text: `Olá, ${client.name}. Acesse seu acompanhamento: ${enterUrl}`,
    });
    if (error) {
      return { ok: false, code: "EMAIL_SEND_FAILED" };
    }
    emailSent = true;
  }

  const data: PostClientPortalLinkResponse = {
    enterUrl,
    emailSent,
    expiresAt: expiresAt.toISOString(),
  };

  return { ok: true, data };
}
