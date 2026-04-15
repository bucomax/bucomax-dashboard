import { createHmac } from "node:crypto";

import { prisma } from "@/infrastructure/database/prisma";
import { whatsappDispatcher } from "@/infrastructure/whatsapp/whatsapp-dispatcher";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET — Meta webhook verification (subscribe handshake)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && token && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — Inbound status updates and interactive button replies
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Always respond 200 quickly — Meta retries on non-2xx
  const rawBody = await request.text();

  // Validate signature
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();

  if (appSecret && signature) {
    const expected =
      "sha256=" +
      createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (signature !== expected) {
      console.warn("[whatsapp-webhook] Invalid signature — rejecting.");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new Response("OK", { status: 200 });
  }

  // Process asynchronously — don't block the 200 response
  processWebhookPayload(payload).catch((err) =>
    console.error("[whatsapp-webhook] processing error:", err),
  );

  return new Response("OK", { status: 200 });
}

// ---------------------------------------------------------------------------
// Types for Meta webhook payload
// ---------------------------------------------------------------------------

type WebhookPayload = {
  object: string;
  entry?: WebhookEntry[];
};

type WebhookEntry = {
  id: string;
  changes?: WebhookChange[];
};

type WebhookChange = {
  value: WebhookChangeValue;
  field: string;
};

type WebhookChangeValue = {
  messaging_product?: string;
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  statuses?: WebhookStatus[];
  messages?: WebhookMessage[];
};

type WebhookStatus = {
  id: string;
  status: string;
  timestamp: string;
  errors?: Array<{ code: number; title: string }>;
};

type WebhookMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
  context?: { from: string; id: string };
};

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

async function processWebhookPayload(payload: WebhookPayload): Promise<void> {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;

      // Resolve tenant by phone_number_id
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const tenant = await prisma.tenant.findFirst({
        where: { whatsappPhoneNumberId: phoneNumberId, whatsappEnabled: true },
        select: { id: true },
      });
      if (!tenant) {
        console.warn(
          `[whatsapp-webhook] No tenant found for phone_number_id=${phoneNumberId}`,
        );
        continue;
      }

      // Process status updates
      for (const status of value.statuses ?? []) {
        await whatsappDispatcher.handleStatusUpdate({
          externalMessageId: status.id,
          status: status.status as "sent" | "delivered" | "read" | "failed",
          timestamp: status.timestamp,
          errorCode: status.errors?.[0]?.code?.toString(),
          errorTitle: status.errors?.[0]?.title,
        });
      }

      // Process interactive button replies
      for (const msg of value.messages ?? []) {
        if (
          msg.type === "interactive" &&
          msg.interactive?.type === "button_reply" &&
          msg.interactive.button_reply &&
          msg.context?.id
        ) {
          await whatsappDispatcher.handleButtonReply({
            externalMessageId: msg.context.id,
            buttonPayload: msg.interactive.button_reply.id,
            timestamp: msg.timestamp,
          });
        }
      }
    }
  }
}
