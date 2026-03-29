import type { ApiPagination } from "@/lib/api/pagination";
import type { SlaHealthStatus } from "@/lib/pathway/sla-health";
import {
  patchClientBodySchema,
  postClientBodySchema,
  publicPatientSelfRegisterBodySchema,
} from "@/lib/validators/client";
import type { z } from "zod";

/** Paciente retornado por `POST /api/v1/clients` e corpo base em listagens. */
export type ClientDto = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  caseDescription: string | null;
  documentId: string | null;
  assignedToUserId: string | null;
  opmeSupplierId: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  opmeSupplier: { id: string; name: string } | null;
  patientPathwayId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Linha de `GET /api/v1/clients` com jornada e SLA derivados. */
export type ClientListItemDto = ClientDto & {
  pathwayId: string | null;
  pathwayName: string | null;
  currentStageId: string | null;
  currentStageName: string | null;
  daysInStage: number | null;
  slaStatus: SlaHealthStatus | null;
  /** Preenchido quando a jornada exibida (a mais recente) está concluída; SLA/dias não se aplicam. */
  journeyCompletedAt: string | null;
};

export type PublishedStageRowDto = {
  id: string;
  stageKey: string;
  name: string;
  sortOrder: number;
  patientMessage: string | null;
  alertWarningDays: number | null;
  alertCriticalDays: number | null;
};

/** Item de `GET /api/v1/pathways` (seletor de jornada / filtros). */
export type PathwayOption = {
  id: string;
  name: string;
  description: string | null;
  publishedVersion: { id: string; version: number } | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientPathwayCreated = {
  id: string;
  client: { id: string; name: string; phone: string };
  pathway: { id: string; name: string };
  currentStage: { id: string; name: string; stageKey: string };
  createdAt: string;
};

/** Filtro de coluna SLA na listagem (`status` em `GET /api/v1/clients`). */
export type ClientListStatusFilter = SlaHealthStatus | "completed";

/** Query string de `GET /api/v1/clients`. */
export type ListClientsQueryParams = {
  limit?: number;
  page?: number;
  q?: string;
  pathwayId?: string;
  stageId?: string;
  status?: ClientListStatusFilter;
};

/** Corpo `POST /api/v1/clients` após validação Zod (`documentId` = 11 dígitos ou null). */
export type CreateClientRequestBody = z.infer<typeof postClientBodySchema>;

/** Corpo `data` de sucesso de `GET /api/v1/clients` (dentro do envelope). */
export type ClientsListResponseData = {
  data: ClientListItemDto[];
  pagination: ApiPagination;
  statusFilterCapped: boolean;
};

/** Corpo `data` de `GET /api/v1/pathways`. */
export type PathwaysListResponseData = {
  pathways: PathwayOption[];
};

/** Corpo `data` de `POST /api/v1/clients`. */
export type CreateClientResponseData = {
  client: ClientDto;
};

/** Corpo `data` de `POST /api/v1/patient-pathways`. */
export type CreatePatientPathwayResponseData = {
  patientPathway: PatientPathwayCreated;
};

export type CreatePatientPathwayRequestBody = {
  clientId: string;
  pathwayId: string;
};

/** Corpo `data` de `GET /api/v1/pathways/{id}/published-stages`. */
export type PublishedPathwayStagesResponseData = {
  pathwayId: string;
  version: { stages: PublishedStageRowDto[] };
};

/** Paciente em `GET /api/v1/clients/:id` (sem `patientPathwayId` redundante no topo). */
export type ClientDetailClientDto = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  caseDescription: string | null;
  documentId: string | null;
  assignedToUserId: string | null;
  opmeSupplierId: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  opmeSupplier: { id: string; name: string } | null;
  patientPathwayId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientDetailStageDocumentDto = {
  id: string;
  sortOrder: number;
  file: { id: string; fileName: string; mimeType: string };
};

export type ClientDetailChecklistItemDto = {
  id: string;
  label: string;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
};

export type ClientDetailStageDto = {
  id: string;
  name: string;
  stageKey: string;
  sortOrder: number;
  alertWarningDays: number | null;
  alertCriticalDays: number | null;
  documents: ClientDetailStageDocumentDto[];
  checklistItems: ClientDetailChecklistItemDto[];
};

export type ClientDetailTransitionDto = {
  id: string;
  fromStage: { id: string; name: string; stageKey: string } | null;
  toStage: { id: string; name: string; stageKey: string };
  note: string | null;
  actor: { id: string; name: string | null; email: string };
  createdAt: string;
};

export type ClientPatientPathwayDetailDto = {
  id: string;
  completedAt: string | null;
  pathway: { id: string; name: string };
  pathwayVersion: { id: string; version: number; stages: ClientDetailStageDto[] };
  currentStage: ClientDetailStageDto | null;
  enteredStageAt: string;
  daysInStage: number;
  slaStatus: SlaHealthStatus;
  transitions: {
    data: ClientDetailTransitionDto[];
    pagination: ApiPagination;
  };
};

/** Jornada já encerrada — histórico na ficha do paciente (fora da jornada ativa). */
export type ClientCompletedTreatmentDto = {
  id: string;
  startedAt: string;
  completedAt: string;
  pathway: { id: string; name: string };
  pathwayVersion: { id: string; version: number; stages: ClientDetailStageDto[] };
  currentStage: ClientPatientPathwayDetailDto["currentStage"];
  /** Ordem cronológica (mais antiga primeiro). */
  transitions: ClientDetailTransitionDto[];
  /** Quando há mais transições do que o limite retornado pela API. */
  transitionsTruncated: boolean;
};

/** Corpo `data` de `GET /api/v1/clients/:id`. */
export type ClientDetailResponseData = {
  client: ClientDetailClientDto;
  /** Jornada em andamento (`completedAt` null), se existir. */
  patientPathway: ClientPatientPathwayDetailDto | null;
  /** Tratamentos concluídos, do mais recente ao mais antigo. */
  completedTreatments: ClientCompletedTreatmentDto[];
};

export type ClientDetailQueryParams = {
  page?: number;
  limit?: number;
};

export type PatchClientRequestBody = z.infer<typeof patchClientBodySchema>;

/** Corpo `data` de `PATCH /api/v1/clients/:id`. */
export type UpdateClientResponseData = {
  client: ClientDto;
};

/** `POST /api/v1/clients/self-register-invites` — link/QR para cadastro pelo paciente. */
export type CreatePatientSelfRegisterInviteResponseData = {
  token: string;
  expiresAt: string;
  registerUrl: string;
};

/** `GET /api/v1/public/patient-self-register?token=` */
export type PublicPatientSelfRegisterValidateResponseData = {
  valid: boolean;
  tenantName?: string;
  expiresAt?: string;
};

/** Corpo `POST /api/v1/public/patient-self-register` (campos do paciente + token). */
export type PublicPatientSelfRegisterRequestBody = z.infer<typeof publicPatientSelfRegisterBodySchema>;

/** `POST /api/v1/public/patient-self-register` — sucesso. */
export type PublicPatientSelfRegisterSubmitResponseData = {
  message: string;
};
