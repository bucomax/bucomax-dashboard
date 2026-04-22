import { z } from "zod";

import { updateEmailDispatchLogFromResendEvent } from "@/infrastructure/email/email-dispatch-log";

const resendEventRecordSchema = z
  .object({
    type: z.string(),
    created_at: z.string().optional(),
    data: z.unknown().optional(),
  })
  .passthrough();

/**
 * Resend envia o corpo do webhook (após `Webhook.verify` do Svix) com `type` e `data`.
 * @see https://resend.com/docs/webhooks/introduction
 */
function extractResendMessageId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as { email_id?: string; id?: string };
  const id = o.email_id?.trim() || o.id?.trim();
  return id || null;
}

export async function processResendWebhookPayload(
  body: object | unknown,
): Promise<void> {
  const parsed = resendEventRecordSchema.safeParse(body);
  if (!parsed.success) {
    return;
  }
  const event = parsed.data;
  const createdAt = event.created_at ? new Date(event.created_at) : new Date();
  if (Number.isNaN(createdAt.getTime())) {
    return;
  }

  const d = event.data;
  if (Array.isArray(d)) {
    for (const item of d) {
      const messageId = extractResendMessageId(item);
      if (messageId) {
        await updateEmailDispatchLogFromResendEvent({
          resendMessageId: messageId,
          eventType: event.type,
          lastEventAt: createdAt,
        });
      }
    }
    return;
  }

  const messageId = extractResendMessageId(d);
  if (messageId) {
    await updateEmailDispatchLogFromResendEvent({
      resendMessageId: messageId,
      eventType: event.type,
      lastEventAt: createdAt,
    });
  }
}
