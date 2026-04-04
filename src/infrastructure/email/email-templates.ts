/**
 * Templates HTML transacionais (Resend).
 * Layout em tabela, preheader, CTA, footer — marca **Bucomax**; tema **escuro** (fundo preto, texto claro).
 */

import { getPublicAppUrl } from "@/lib/config/urls";

/** Tema escuro único para todos os e-mails transacionais (fundo preto, texto claro). */
const BRAND = {
  pageBg: "#000000",
  cardBg: "#000000",
  headerBg: "#000000",
  primary: "#fafafa",
  ctaBg: "#fafafa",
  ctaText: "#000000",
  background: "#000000",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  border: "#3f3f46",
  link: "#e4e4e7",
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
  <meta name="color-scheme" content="dark">
  <title>Bucomax</title>
  ${preheader ? `<style type="text/css">#preheader { display: none !important; }</style>` : ""}
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.pageBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<span id="preheader">${preheader}</span>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: ${BRAND.cardBg}; border-radius: 12px; overflow: hidden; border: 1px solid ${BRAND.border};">
          <tr>
            <td style="background-color: ${BRAND.headerBg}; padding: 24px 32px; text-align: center; border-bottom: 1px solid ${BRAND.border};">
              <a href="${base}" style="text-decoration: none; color: ${BRAND.primary}; font-size: 22px; font-weight: 700;">Bucomax</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 40px; background-color: ${BRAND.background};">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: ${BRAND.cardBg}; border-top: 1px solid ${BRAND.border};">
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
      <a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: ${BRAND.ctaBg}; color: ${BRAND.ctaText}; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
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

/** Paciente: acesso ao portal da jornada (magic link). */
export function getPatientPortalMagicLinkHtml(params: {
  patientName: string;
  clinicName: string;
  enterUrl: string;
  /** Se true, o texto alerta uso único do link (envio por e-mail). */
  singleUse: boolean;
}): string {
  const patient = escapeHtmlText(params.patientName);
  const clinic = escapeHtmlText(params.clinicName);
  const reuseNote = params.singleUse
    ? "Este link expira em 72 horas e só pode ser usado uma vez."
    : "Este link expira em 72 horas e pode ser aberto várias vezes até lá (guarde-o em local seguro).";
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: ${BRAND.text}; line-height: 1.3;">
      Acesse seu acompanhamento
    </h1>
    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Olá, ${patient}!
    </p>
    <p style="margin: 0 0 8px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      A clínica <strong>${clinic}</strong> disponibilizou um link seguro para você acompanhar sua jornada no Bucomax.
    </p>
    ${ctaButton(params.enterUrl, "Abrir portal do paciente")}
    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
      Ou copie e cole no navegador:
    </p>
    <p style="margin: 4px 0 0; font-size: 12px; color: ${BRAND.textMuted}; word-break: break-all;">
      <a href="${params.enterUrl}" style="color: ${BRAND.link}; text-decoration: underline;">${params.enterUrl}</a>
    </p>
    <p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid ${BRAND.border}; font-size: 12px; color: ${BRAND.textMuted};">
      ${reuseNote} Se você não solicitou este acesso, ignore este e-mail.
    </p>
  `;
  return baseLayout(content, `Acesso ao portal — ${escapeHtmlText(params.clinicName)}`);
}

/** Paciente: código para entrar no portal com CPF (OTP). */
export function getPatientPortalOtpHtml(params: {
  patientName: string;
  clinicName: string;
  code: string;
}): string {
  const patient = escapeHtmlText(params.patientName);
  const clinic = escapeHtmlText(params.clinicName);
  const code = escapeHtmlText(params.code);
  const content = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: ${BRAND.text}; line-height: 1.3;">
      Seu código de acesso
    </h1>
    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Olá, ${patient}!
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
      Use o código abaixo para entrar no portal da clínica <strong>${clinic}</strong>. Ele vale por poucos minutos.
    </p>
    <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 0.2em; color: ${BRAND.primary}; text-align: center;">
      ${code}
    </p>
    <p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid ${BRAND.border}; font-size: 12px; color: ${BRAND.textMuted};">
      Se você não pediu este código, ignore este e-mail.
    </p>
  `;
  return baseLayout(content, `Código do portal — ${escapeHtmlText(params.clinicName)}`);
}
