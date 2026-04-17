import type { ApiPagination } from "@/lib/api/pagination";
import type { SlaHealthStatus } from "@/domain/pathway/sla-health";

/** Filtro de status no pipeline (`""` = todos). */
export type PipelineStatusFilter = "" | SlaHealthStatus;

/** Jornada exibível no seletor do dashboard (com ou sem versão publicada). */
export type DashboardPathwayOption = {
  id: string;
  name: string;
  publishedVersion: { id: string; version: number } | null;
};

/** Opção do filtro OPME no pipeline (lista vinda da API + entradas fixas na UI). */
export type DashboardPipelineOpmeOption = { value: string; label: string };

/** Totais dos cards de métricas (SLA agregado na versão publicada). */
export type DashboardSummaryTotals = {
  total: number;
  ok: number;
  warning: number;
  danger: number;
};

/** Card de paciente em coluna do Kanban (resposta API). */
export type KanbanPatientPathway = {
  id: string;
  enteredStageAt: string;
  slaStatus: SlaHealthStatus;
  client: { id: string; name: string; phone: string };
  currentStage: {
    id: string;
    stageKey: string;
    name: string;
    sortOrder: number;
    alertWarningDays: number | null;
    alertCriticalDays: number | null;
  };
  currentStageAssignee: { id: string; name: string | null; email: string } | null;
  updatedAt: string;
};

export type KanbanColumn = {
  stage: {
    id: string;
    stageKey: string;
    name: string;
    sortOrder: number;
    patientMessage: string | null;
    alertWarningDays: number | null;
    alertCriticalDays: number | null;
  };
  data: KanbanPatientPathway[];
  pagination: ApiPagination;
};

export type DashboardAlertRow = {
  patientPathwayId: string;
  clientId: string;
  clientName: string;
  daysInStage: number;
  stageName: string;
};

export type DashboardPipelineSectionProps = {
  pathways: DashboardPathwayOption[];
};
