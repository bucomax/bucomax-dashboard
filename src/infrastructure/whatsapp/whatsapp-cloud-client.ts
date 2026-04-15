/**
 * Low-level HTTP client for WhatsApp Business Cloud API (Meta Graph API v21.0).
 * All methods throw on non-2xx responses.
 */

const BASE_URL = "https://graph.facebook.com/v21.0";
const TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WhatsAppApiError = {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type SendMessageResponse = {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
};

type PhoneNumberInfoResponse = {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
};

export type InteractiveButton = {
  type: "reply";
  reply: { id: string; title: string };
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function metaFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = await res.json();

  if (!res.ok) {
    const apiErr = body as WhatsAppApiError;
    const msg = apiErr?.error?.message ?? res.statusText;
    const code = apiErr?.error?.code ?? res.status;
    throw new Error(`[WhatsApp API] ${code}: ${msg}`);
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a document via media URL.
 * Returns the WhatsApp message ID (wamid).
 */
export async function sendDocumentMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string,
): Promise<string> {
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "document",
    document: {
      link: documentUrl,
      filename,
      ...(caption ? { caption } : {}),
    },
  };

  const data = await metaFetch<SendMessageResponse>(url, accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.messages[0].id;
}

/**
 * Send an interactive message with reply buttons (max 3 buttons).
 * Returns the WhatsApp message ID.
 */
export async function sendInteractiveButtonMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  bodyText: string,
  buttons: InteractiveButton[],
): Promise<string> {
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: { buttons },
    },
  };

  const data = await metaFetch<SendMessageResponse>(url, accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.messages[0].id;
}

/**
 * Send a plain text message.
 * Returns the WhatsApp message ID (wamid).
 */
export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
): Promise<string> {
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  };

  const data = await metaFetch<SendMessageResponse>(url, accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.messages[0].id;
}

/**
 * Fetches phone number info — useful to validate credentials.
 */
export async function getPhoneNumberInfo(
  phoneNumberId: string,
  accessToken: string,
): Promise<PhoneNumberInfoResponse> {
  const url = `${BASE_URL}/${phoneNumberId}`;
  return metaFetch<PhoneNumberInfoResponse>(url, accessToken);
}
