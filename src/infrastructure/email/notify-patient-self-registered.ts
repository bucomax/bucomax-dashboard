import { prisma } from "@/infrastructure/database/prisma";
import { notificationEmitter } from "@/infrastructure/notifications/notification-emitter";
import { getPatientSelfRegisteredStaffHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail } from "@/infrastructure/email/resend.client";
import { getPublicAppUrl } from "@/lib/config/urls";

type NotifyParams = {
  tenantId: string;
  clientId: string;
  patientName: string;
  clinicName: string;
};

/**
 * Notifica membros do tenant após cadastro público do paciente:
 * - **Painel:** notificação in-app tipo `new_patient` para todos os membros (sempre, mesmo se
 *   «novos pacientes» estiver desligado nas preferências — é evento explícito de auto-cadastro).
 * - **E-mail:** template transacional Bucomax (Resend) quando `RESEND_API_KEY` está configurada.
 */
export async function notifyStaffPatientSelfRegistered(params: NotifyParams): Promise<void> {
  const { tenantId, clientId, patientName, clinicName } = params;
  const base = getPublicAppUrl().replace(/\/$/, "");
  const openPatientUrl = `${base}/dashboard/clients/${clientId}`;

  await notificationEmitter.emit({
    tenantId,
    type: "new_patient",
    title: `Novo paciente (auto-cadastro): ${patientName}`,
    body: `Cadastro concluído pelo link. Escolha a jornada de tratamento no painel.`,
    correlationId: clientId,
    ignoreTenantNotificationPreference: true,
    metadata: {
      clientId,
      source: "patient_self_register",
    },
  });

  /** E-mail: mesmo layout dos outros templates Bucomax (`email-templates.ts`). */
  if (!isEmailConfigured()) {
    return;
  }

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId },
    include: {
      user: { select: { email: true, name: true, deletedAt: true } },
    },
  });

  const recipients = memberships
    .map((m) => m.user)
    .filter((u) => u.deletedAt == null && u.email.trim().length > 0);

  await Promise.allSettled(
    recipients.map((user) =>
      sendEmail({
        to: user.email,
        subject: `Bucomax — Novo paciente: ${patientName}`,
        html: getPatientSelfRegisteredStaffHtml({
          staffName: user.name,
          patientName,
          clinicName,
          openPatientUrl,
        }),
        text: `${patientName} concluiu o cadastro em ${clinicName}. Abra: ${openPatientUrl}`,
      }),
    ),
  );
}
