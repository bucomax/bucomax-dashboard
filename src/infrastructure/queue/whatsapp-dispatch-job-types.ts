export type WhatsAppDispatchJobPayload = {
  tenantId: string;
  stageTransitionId: string;
  clientId: string;
  recipientPhone: string;
  stageName: string;
  documents: Array<{
    fileName: string;
    r2Key: string;
    mimeType: string;
  }>;
};
