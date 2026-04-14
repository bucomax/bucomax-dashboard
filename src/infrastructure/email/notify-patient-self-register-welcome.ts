import { getPatientSelfRegisterWelcomeHtml } from "@/infrastructure/email/email-templates";
import { isEmailConfigured, sendEmail } from "@/infrastructure/email/resend.client";
import { getPublicAppUrl } from "@/lib/config/urls";

type NotifyParams = {
  patientEmail: string;
  patientName: string;
  clinicName: string;
  tenantSlug: string;
};

/**
 * E-mail ao paciente após auto-cadastro pelo link/QR: confirmação + boas-vindas + link do portal.
 * Falha silenciosa se Resend não estiver configurado (mesmo padrão dos outros envios).
 */
export async function notifyPatientSelfRegisterWelcome(params: NotifyParams): Promise<void> {
  if (!isEmailConfigured()) {
    return;
  }

  const to = params.patientEmail.trim();
  if (!to) {
    return;
  }

  const base = getPublicAppUrl().replace(/\/$/, "");
  const slug = params.tenantSlug.trim();
  const portalLoginUrl = `${base}/${encodeURIComponent(slug)}/patient/login`;
  const clinic = params.clinicName.trim() || "sua clínica";
  const subject = `Tudo certo — ${clinic} recebeu seu cadastro`;

  const text = [
    `Olá!`,
    ``,
    `Recebemos seu cadastro com sucesso na ${clinic}.`,
    `Em breve a clínica entra em contato pelo telefone ou WhatsApp informados.`,
    ``,
    `Portal do paciente: ${portalLoginUrl}`,
    ``,
    `— Bucomax`,
  ].join("\n");

  await sendEmail({
    to,
    subject,
    html: getPatientSelfRegisterWelcomeHtml({
      patientName: params.patientName,
      clinicName: clinic,
      portalLoginUrl,
    }),
    text,
  });
}
