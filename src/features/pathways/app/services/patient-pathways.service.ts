import { normalizeApiError } from "@/lib/api/axios-error";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";
import type {
  PatchPatientChecklistItemRequestBody,
  PatchPatientChecklistItemResponseData,
} from "@/types/api/patient-pathways-v1";
import type {
  PatientPathwayDetail,
  TogglePatientChecklistItemInput,
  TransitionPatientStageInput,
} from "@/features/pathways/types/patient-pathways";

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
  body: TransitionPatientStageInput,
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

export async function completePatientPathway(patientPathwayId: string): Promise<void> {
  try {
    const res = await apiClient.post<ApiEnvelope<{ patientPathway: unknown }>>(
      `/api/v1/patient-pathways/${patientPathwayId}/complete`,
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
  } catch (e) {
    throw normalizeApiError(e);
  }
}

export async function togglePatientChecklistItem(
  patientPathwayId: string,
  checklistItemId: string,
  body: TogglePatientChecklistItemInput,
): Promise<PatchPatientChecklistItemResponseData["item"]> {
  try {
    const res = await apiClient.patch<ApiEnvelope<PatchPatientChecklistItemResponseData>>(
      `/api/v1/patient-pathways/${patientPathwayId}/checklist-items/${checklistItemId}`,
      body,
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data.item;
  } catch (e) {
    throw normalizeApiError(e);
  }
}
