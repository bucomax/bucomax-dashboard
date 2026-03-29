/**
 * Templates HTML transacionais (Resend).
 * Estrutura alinhada ao kaber.ai (`src/infrastructure/email/email-templates.ts`):
 * layout em tabela, preheader, CTA, footer — marca **Bucomax**.
 */

import { getPublicAppUrl } from "@/lib/config/urls";

const BRAND = {
  primary: "#0f766e",
  background: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  link: "#0f766e",
} as const;

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseLayout(content: string, preheader?: string): string {
  const base = getPublicAppUrl();
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Bucomax</title>
  ${preheader ? `<style type="text/css">#preheader { display: none !important; }</style>` : ""}
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<span id="preheader">${preheader}</span>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: ${BRAND.background}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color: ${BRAND.primary}; padding: 24px 32px; text-align: center;">
              <a href="${base}" style="text-decoration: none; color: #ffffff; font-size: 22px; font-weight: 700;">Bucomax</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid ${BRAND.border};">
              <p style="margin: 0; font-size: 12px; color: ${BRAND.textMuted}; text-align: center;">
                Bucomax — plataforma clínica multi-tenant
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: ${BRAND.textMuted}; text-align: center;">
                <a href="${base}" style="color: ${BRAND.link}; text-decoration: underline;">Abrir aplicação</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function ctaButton(href: string, label: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: ${BRAND.primary}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
        ${label}
      </a>
    </td>
  </tr>
</table>
`.trim();
}

/** Confirmação de e-mail (cadastro público, se existir). */
export function getConfirmEmailHtml(params: { name: string | null; confirmUrl: string }): string {
  const name = params.name || "Usuário";
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: ${BRAND.text}; line-height: 1.3;">
      Confirme seu e-mail
    </h1>
    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Olá, ${name}!
    </p>
    <p style="margin: 0 0 8px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Clique no botão abaixo para confirmar seu endereço de e-mail e ativar sua conta.
    </p>
    ${ctaButton(params.confirmUrl, "Confirmar e-mail")}
    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
      Ou copie e cole no navegador:
    </p>
    <p style="margin: 4px 0 0; font-size: 12px; color: ${BRAND.textMuted}; word-break: break-all;">
      <a href="${params.confirmUrl}" style="color: ${BRAND.link}; text-decoration: underline;">${params.confirmUrl}</a>
    </p>
    <p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid ${BRAND.border}; font-size: 12px; color: ${BRAND.textMuted};">
      Este link expira em 24 horas. Se você não criou esta conta, ignore este e-mail.
    </p>
  `;
  return baseLayout(content, `Confirme seu e-mail — Bucomax`);
}

/** Recuperação de senha. */
export function getResetPasswordHtml(params: { name: string | null; resetUrl: string }): string {
  const name = params.name || "Usuário";
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: ${BRAND.text}; line-height: 1.3;">
      Recuperação de senha
    </h1>
    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Olá, ${name}!
    </p>
    <p style="margin: 0 0 8px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.
    </p>
    ${ctaButton(params.resetUrl, "Redefinir senha")}
    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
      Ou copie e cole no navegador:
    </p>
    <p style="margin: 4px 0 0; font-size: 12px; color: ${BRAND.textMuted}; word-break: break-all;">
      <a href="${params.resetUrl}" style="color: ${BRAND.link}; text-decoration: underline;">${params.resetUrl}</a>
    </p>
    <p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid ${BRAND.border}; font-size: 12px; color: ${BRAND.textMuted};">
      Este link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.
    </p>
  `;
  return baseLayout(content, `Redefina sua senha — Bucomax`);
}

/**
 * Convite: administrador criou a conta — usuário define a senha no primeiro acesso.
 */
export function getInviteSetPasswordHtml(params: { name: string | null; setPasswordUrl: string }): string {
  const name = params.name || "Usuário";
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: ${BRAND.text}; line-height: 1.3;">
      Você foi convidado para o Bucomax
    </h1>
    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Olá, ${name}!
    </p>
    <p style="margin: 0 0 8px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Uma conta foi criada para você. Clique no botão abaixo para definir sua senha e começar.
    </p>
    ${ctaButton(params.setPasswordUrl, "Definir senha")}
    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
      Ou copie e cole no navegador:
    </p>
    <p style="margin: 4px 0 0; font-size: 12px; color: ${BRAND.textMuted}; word-break: break-all;">
      <a href="${params.setPasswordUrl}" style="color: ${BRAND.link}; text-decoration: underline;">${params.setPasswordUrl}</a>
    </p>
    <p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid ${BRAND.border}; font-size: 12px; color: ${BRAND.textMuted};">
      Este link expira em 48 horas. Se você não esperava este convite, ignore este e-mail.
    </p>
  `;
  return baseLayout(content, `Defina sua senha — convite Bucomax`);
}

/** Equipe da clínica: paciente concluiu auto-cadastro pelo link/QR (mesmo padrão visual dos demais e-mails transacionais). */
export function getPatientSelfRegisteredStaffHtml(params: {
  staffName: string | null;
  patientName: string;
  clinicName: string;
  openPatientUrl: string;
}): string {
  const whoRaw = params.staffName?.trim() || "Olá";
  const who = escapeHtmlText(whoRaw);
  const patient = escapeHtmlText(params.patientName);
  const clinic = escapeHtmlText(params.clinicName);
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: ${BRAND.text}; line-height: 1.3;">
      Novo paciente — cadastro pelo paciente
    </h1>
    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      ${who},
    </p>
    <p style="margin: 0 0 8px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      <strong>${patient}</strong> concluiu o formulário em <strong>${clinic}</strong>.
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Acesse o painel para escolher o tipo de tratamento / jornada deste paciente.
    </p>
    ${ctaButton(params.openPatientUrl, "Abrir ficha do paciente")}
    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
      Ou copie o link:
    </p>
    <p style="margin: 4px 0 0; font-size: 12px; color: ${BRAND.textMuted}; word-break: break-all;">
      <a href="${params.openPatientUrl}" style="color: ${BRAND.link}; text-decoration: underline;">${params.openPatientUrl}</a>
    </p>
    <p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid ${BRAND.border}; font-size: 12px; color: ${BRAND.textMuted}; line-height: 1.5;">
      Este aviso foi enviado porque você é membro da equipe desta clínica no Bucomax. Se não deveria recebê-lo, ignore esta mensagem.
    </p>
  `;
  return baseLayout(content, `Novo paciente em ${escapeHtmlText(params.clinicName)} — Bucomax`);
}
