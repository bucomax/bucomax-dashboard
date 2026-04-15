export type PatchPatientChecklistItemRequestBody = {
  completed: boolean;
};

export type PatientChecklistItemProgressDto = {
  checklistItemId: string;
  completed: boolean;
  completedAt: string | null;
};

export type PatchPatientChecklistItemResponseData = {
  item: PatientChecklistItemProgressDto;
};

// ---------------------------------------------------------------------------
// Channel Dispatch
// ---------------------------------------------------------------------------

export type ChannelDispatchDto = {
  id: string;
  stageTransitionId: string;
  channel: "WHATSAPP";
  status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "CONFIRMED" | "FAILED";
  externalMessageId: string | null;
  recipientPhone: string;
  documentFileName: string | null;
  errorDetail: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  confirmedAt: string | null;
  confirmationPayload: string | null;
  createdAt: string;
};

export type GetPatientPathwayDispatchesResponseData = {
  dispatches: ChannelDispatchDto[];
};
