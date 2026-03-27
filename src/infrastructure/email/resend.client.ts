/**
 * Cliente Resend — transacional (recuperação de senha, convites).
 * @see https://resend.com/docs
 */

import { Resend } from "resend";
import { getPublicAppUrl } from "@/lib/config/urls";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM ?? "iDoctor <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada.");
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ id?: string; error?: Error }> {
  try {
    const resend = getClient();
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) {
      console.error("Resend error:", error);
      return { error: new Error(error.message) };
    }
    return { id: data?.id };
  } catch (err) {
    console.error("Erro ao enviar email:", err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

const appUrl = () => getPublicAppUrl().replace(/\/$/, "");

export function buildResetPasswordUrl(token: string): string {
  return `${appUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

export function buildInviteSetPasswordUrl(token: string): string {
  return `${appUrl()}/auth/invite?token=${encodeURIComponent(token)}`;
}
