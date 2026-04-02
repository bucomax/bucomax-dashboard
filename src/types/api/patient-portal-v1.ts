import type { ApiPagination } from "@/lib/api/pagination";
import type { ClientTimelineAuditEventType } from "@/types/api/clients-v1";
import type { PatientPortalFileReviewStatusDto } from "@/types/api/files-v1";

/** `GET /api/v1/patient/overview` */
export type PatientPortalOverviewResponse = {
  client: {
    name: string;
    email: string | null;
  };
  tenant: {
    name: string;
  };
  activeJourney: null | {
    patientPathwayId: string;
    pathwayName: string;
    currentStageName: string;
    enteredStageAt: string;
  };
};

/** `POST /api/v1/clients/:clientId/portal-link` */
export type PostClientPortalLinkResponse = {
  enterUrl: string;
  emailSent: boolean;
  expiresAt: string;
};

/** Evento de auditoria na timeline do portal (sem e-mail/id do ator). */
export type PatientPortalTimelineAuditItemDto = {
  kind: "audit";
  id: string;
  type: ClientTimelineAuditEventType;
  createdAt: string;
  actorName: string | null;
  payload: Record<string, unknown>;
};

/** Transição legada: só nomes de etapa (sem notas nem responsáveis). */
export type PatientPortalTimelineLegacyItemDto = {
  kind: "legacy_transition";
  id: string;
  createdAt: string;
  fromStage: { name: string } | null;
  toStage: { name: string };
};

export type PatientPortalTimelineItemDto =
  | PatientPortalTimelineAuditItemDto
  | PatientPortalTimelineLegacyItemDto;

/** `GET /api/v1/patient/timeline` */
export type PatientPortalTimelineResponseData = {
  items: PatientPortalTimelineItemDto[];
  pagination: ApiPagination;
  timelineCapped: boolean;
};

/** Linha de `GET /api/v1/patient/files`. */
export type PatientPortalFileItemDto = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  patientPortalReviewStatus: PatientPortalFileReviewStatusDto;
};

export type PatientPortalFilesListResponseData = {
  data: PatientPortalFileItemDto[];
  pagination: ApiPagination;
};

/** `POST /api/v1/patient/files` (registro após PUT no storage). */
export type PatientPortalFileRegisteredResponse = {
  file: PatientPortalFileItemDto & { publicUrl: string };
};
