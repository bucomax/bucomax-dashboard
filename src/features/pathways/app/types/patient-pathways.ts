import type { PatchPatientChecklistItemRequestBody } from "@/types/api/patient-pathways-v1";

export type PatientPathwayDetail = {
  id: string;
  client: { id: string; name: string; phone: string; caseDescription: string | null };
  pathway: { id: string; name: string; description: string | null };
  pathwayVersion: {
    id: string;
    version: number;
    stages: {
      id: string;
      name: string;
      stageKey: string;
      sortOrder: number;
      alertWarningDays: number | null;
      alertCriticalDays: number | null;
      defaultAssigneeUserId: string | null;
    }[];
  };
  currentStage: {
    id: string;
    name: string;
    stageKey: string;
    alertWarningDays: number | null;
    alertCriticalDays: number | null;
    defaultAssigneeUserId: string | null;
  } | null;
  currentStageAssignee: { id: string; name: string | null; email: string } | null;
  /** Checklist da etapa atual (template + progresso do paciente). */
  currentStageChecklist: {
    id: string;
    label: string;
    requiredForTransition: boolean;
    completed: boolean;
    completedAt: string | null;
  }[];
  transitions: {
    id: string;
    fromStage: { id: string; name: string; stageKey: string } | null;
    toStage: { id: string; name: string; stageKey: string } | null;
    note: string | null;
    ruleOverrideReason: string | null;
    forcedBy: { id: string; name: string | null; email: string } | null;
    actor: { id: string; name: string | null; email: string };
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type TransitionPatientStageInput = {
  toStageId: string;
  note?: string;
  force?: boolean;
  overrideReason?: string;
};

export type TogglePatientChecklistItemInput = PatchPatientChecklistItemRequestBody;
