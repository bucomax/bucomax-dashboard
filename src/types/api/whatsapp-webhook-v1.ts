export type WhatsappWebhookPayload = {
  object: string;
  entry?: WhatsappWebhookEntry[];
};

export type WhatsappWebhookEntry = {
  id: string;
  changes?: WhatsappWebhookChange[];
};

export type WhatsappWebhookChange = {
  value: WhatsappWebhookChangeValue;
  field: string;
};

export type WhatsappWebhookChangeValue = {
  messaging_product?: string;
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  statuses?: WhatsappWebhookStatus[];
  messages?: WhatsappWebhookMessage[];
};

export type WhatsappWebhookStatus = {
  id: string;
  status: string;
  timestamp: string;
  errors?: Array<{ code: number; title: string }>;
};

export type WhatsappWebhookMessage = {
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
