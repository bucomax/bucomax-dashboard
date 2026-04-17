import { createHmac } from "node:crypto";

import { whatsappWebhookPayloadSchema } from "@/lib/validators/whatsapp-webhook";
import type { WhatsappWebhookPayload } from "@/types/api/whatsapp-webhook-v1";
import { processWhatsappWebhookPayload } from "@/application/use-cases/whatsapp/process-whatsapp-webhook-payload";

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
  const rawBody = await request.text();

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

  let payload: WhatsappWebhookPayload;
  try {
    const parsedPayload = whatsappWebhookPayloadSchema.safeParse(JSON.parse(rawBody));
    if (!parsedPayload.success) {
      return new Response("OK", { status: 200 });
    }
    payload = parsedPayload.data;
  } catch {
    return new Response("OK", { status: 200 });
  }

  processWhatsappWebhookPayload(payload).catch((err) =>
    console.error("[whatsapp-webhook] processing error:", err),
  );

  return new Response("OK", { status: 200 });
}
