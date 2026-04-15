import { prisma } from "@/infrastructure/database/prisma";
import { getFileReviewResultPatientHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail } from "@/infrastructure/email/resend.client";
import { decryptTenantSecret } from "@/infrastructure/crypto/tenant-secret";
import { sendTextMessage } from "@/infrastructure/whatsapp/whatsapp-cloud-client";
import { getPublicAppUrl } from "@/lib/config/urls";

type NotifyParams = {
  tenantId: string;
  clientId: string;
  fileName: string;
  decision: "approve" | "reject";
  rejectReason?: string;
};

/**
 * Notifica o paciente apos revisao de arquivo enviado pelo portal:
 * - **E-mail:** se o paciente tem e-mail cadastrado e Resend esta configurado.
 * - **WhatsApp:** se o tenant tem WhatsApp habilitado e o paciente tem telefone.
 */
export async function notifyPatientFileReviewed(params: NotifyParams): Promise<void> {
  const { tenantId, clientId, fileName, decision, rejectReason } = params;

  const [client, tenant] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { name: true, email: true, phone: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        slug: true,
        whatsappEnabled: true,
        whatsappPhoneNumberId: true,
        whatsappAccessTokenEnc: true,
      },
    }),
  ]);

  if (!client || !tenant) return;

  const base = getPublicAppUrl().replace(/\/$/, "");
  const portalUrl = `${base}/${encodeURIComponent(tenant.slug)}/patient`;

  const clinicName = tenant.name;
  const patientName = client.name?.trim() || "Paciente";

  // --- E-mail ---
  if (isEmailConfigured() && client.email?.trim()) {
    const isApproved = decision === "approve";
    const subject = isApproved
      ? `Bucomax — Documento aprovado: ${fileName}`
      : `Bucomax — Documento precisa de ajustes: ${fileName}`;

    sendEmail({
      to: client.email.trim(),
      subject,
      html: getFileReviewResultPatientHtml({
        patientName,
        clinicName,
        fileName,
        decision,
        rejectReason,
        portalUrl,
      }),
      text: isApproved
        ? `Seu documento "${fileName}" foi aprovado pela ${clinicName}. Acesse: ${portalUrl}`
        : `Seu documento "${fileName}" precisa de ajustes. ${rejectReason ? `Motivo: ${rejectReason}. ` : ""}Acesse: ${portalUrl}`,
    }).catch((err) => console.error("[notify-file-reviewed] email failed:", err));
  }

  // --- WhatsApp ---
  if (
    tenant.whatsappEnabled &&
    tenant.whatsappPhoneNumberId &&
    tenant.whatsappAccessTokenEnc &&
    client.phone?.trim()
  ) {
    const isApproved = decision === "approve";
    const message = isApproved
      ? `${clinicName}: Seu documento "${fileName}" foi aprovado. Acesse o portal para acompanhar sua jornada: ${portalUrl}`
      : `${clinicName}: Seu documento "${fileName}" precisa de ajustes.${rejectReason ? ` Motivo: ${rejectReason}.` : ""} Acesse o portal: ${portalUrl}`;

    try {
      const accessToken = decryptTenantSecret(tenant.whatsappAccessTokenEnc);
      await sendTextMessage(
        tenant.whatsappPhoneNumberId,
        accessToken,
        client.phone.trim(),
        message,
      );
    } catch (err) {
      console.error("[notify-file-reviewed] whatsapp failed:", err);
    }
  }
}
