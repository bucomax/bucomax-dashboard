import { normalizeApiError } from "@/lib/api/axios-error";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";

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

export async function getPatientPathway(patientPathwayId: string): Promise<PatientPathwayDetail> {
  try {
    const res = await apiClient.get<ApiEnvelope<{ patientPathway: PatientPathwayDetail }>>(
      `/api/v1/patient-pathways/${patientPathwayId}`,
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data.patientPathway;
  } catch (e) {
    throw normalizeApiError(e);
  }
}

export async function transitionPatientStage(
  patientPathwayId: string,
  body: { toStageId: string; note?: string },
): Promise<void> {
  try {
    const res = await apiClient.post<ApiEnvelope<{ patientPathway: unknown }>>(
      `/api/v1/patient-pathways/${patientPathwayId}/transition`,
      body,
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
  } catch (e) {
    throw normalizeApiError(e);
  }
}
