import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";
import type { ClientDto, PathwayOption, PatientPathwayCreated } from "@/features/clients/app/types/api";
import type { NewClientFormValues } from "@/features/clients/app/utils/schemas";

type ListClientsPayload = {
  clients: ClientDto[];
  total: number;
  limit: number;
  offset: number;
};

type PathwaysPayload = { pathways: PathwayOption[] };

type CreateClientPayload = { client: ClientDto };

type CreatePatientPathwayPayload = { patientPathway: PatientPathwayCreated };

export async function listClients(params?: { limit?: number; offset?: number; q?: string }): Promise<ListClientsPayload> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  if (params?.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  const url = qs ? `/api/v1/clients?${qs}` : "/api/v1/clients";
  const res = await apiClient.get<ApiEnvelope<ListClientsPayload>>(url);
  if (!res.data.success) {
    throw new Error(res.data.error.message);
  }
  return res.data.data;
}

export async function listPathwaysForTenant(): Promise<PathwayOption[]> {
  const res = await apiClient.get<ApiEnvelope<PathwaysPayload>>("/api/v1/pathways");
  if (!res.data.success) {
    throw new Error(res.data.error.message);
  }
  return res.data.data.pathways;
}

export async function createClient(body: NewClientFormValues): Promise<ClientDto> {
  const res = await apiClient.post<ApiEnvelope<CreateClientPayload>>("/api/v1/clients", body);
  if (!res.data.success) {
    throw new Error(res.data.error.message);
  }
  return res.data.data.client;
}

export async function createPatientPathway(input: { clientId: string; pathwayId: string }): Promise<PatientPathwayCreated> {
  const res = await apiClient.post<ApiEnvelope<CreatePatientPathwayPayload>>("/api/v1/patient-pathways", input);
  if (!res.data.success) {
    throw new Error(res.data.error.message);
  }
  return res.data.data.patientPathway;
}
