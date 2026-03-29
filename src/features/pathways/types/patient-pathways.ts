import type { PatchPatientChecklistItemRequestBody } from "@/types/api/patient-pathways-v1";

export type PatientPathwayDetail = {
  id: string;
  client: { id: string; name: string; phone: string; caseDescription: string | null };
  pathway: { id: string; name: string; description: string | null };
  pathwayVersion: {
    id: string;
    version: number;
    stages: { id: string; name: string; stageKey: string; sortOrder: number }[];
  };
  currentStage: { id: string; name: string; stageKey: string } | null;
  transitions: {
    id: string;
    fromStage: { id: string; name: string; stageKey: string } | null;
    toStage: { id: string; name: string; stageKey: string } | null;
    note: string | null;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type TransitionPatientStageInput = {
  toStageId: string;
  note?: string;
};

export type TogglePatientChecklistItemInput = PatchPatientChecklistItemRequestBody;
