import type { ApiPagination } from "@/lib/api/pagination";
import type { ClientDetailResponseData, ClientTimelineAuditEventType } from "@/types/api/clients-v1";
import type { PatientPortalFileReviewStatusDto } from "@/types/api/files-v1";

/** `GET /api/v1/patient/detail` — mesma forma que a ficha interna; campos operacionais da equipe vêm nulos + contexto da clínica. */
export type PatientPortalDetailResponseData = ClientDetailResponseData & {
  tenant: { name: string };
};

/** Resposta de `PATCH /api/v1/patient/profile`. */
export type PatientPortalProfilePatchResponseData = {
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    documentId: string | null;
    updatedAt: string;
  };
};

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
