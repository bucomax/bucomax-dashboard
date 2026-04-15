export type WhatsAppDispatchDocument = {
  fileName: string;
  r2Key: string;
  mimeType: string;
};

export type WhatsAppDispatchInput = {
  tenantId: string;
  stageTransitionId: string;
  clientId: string;
  recipientPhone: string;
  stageName: string;
  documents: WhatsAppDispatchDocument[];
};

export type WhatsAppDispatchResult = {
  /** ChannelDispatch IDs created (one per document + one for the confirmation message). */
  dispatchIds: string[];
};

export type WhatsAppStatusUpdate = {
  externalMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  errorCode?: string;
  errorTitle?: string;
};

export type WhatsAppButtonReply = {
  externalMessageId: string;
  buttonPayload: string;
  timestamp: string;
};

export interface IWhatsAppDispatcher {
  dispatch(input: WhatsAppDispatchInput): Promise<WhatsAppDispatchResult>;
  handleStatusUpdate(update: WhatsAppStatusUpdate): Promise<void>;
  handleButtonReply(reply: WhatsAppButtonReply): Promise<void>;
  testConnection(tenantId: string): Promise<{ ok: boolean; error?: string }>;
}
