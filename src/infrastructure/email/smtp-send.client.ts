import nodemailer from "nodemailer";

export type SmtpConnectionInput = {
  host: string;
  port: number;
  /** true = porta 465 (SSL direto); false = 587/STARTTLS */
  secure: boolean;
  user: string;
  pass: string;
};

/**
 * Envia e-mail transacional via SMTP (Gmail, Microsoft 365, etc.).
 * Retorna `id` a partir do `messageId` (Message-ID), para o log.
 */
export async function sendEmailViaSmtp(
  connection: SmtpConnectionInput,
  message: { from: string; to: string; subject: string; html: string; text?: string },
): Promise<{ id?: string; error?: Error }> {
  try {
    const transporter = nodemailer.createTransport({
      host: connection.host,
      port: connection.port,
      secure: connection.secure,
      auth: { user: connection.user, pass: connection.pass },
      requireTLS: !connection.secure && connection.port === 587,
    });
    const info = await transporter.sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    const raw = info.messageId?.trim() ?? "";
    const id = raw.replace(/^<|>$/g, "") || raw;
    return { id: id || undefined };
  } catch (err) {
    console.error("SMTP error:", err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
