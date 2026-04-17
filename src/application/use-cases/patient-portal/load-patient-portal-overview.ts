import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";
import type { PatientPortalOverviewResponse } from "@/types/api/patient-portal-v1";

export async function loadPatientPortalOverview(params: {
  tenantId: string;
  clientId: string;
}): Promise<PatientPortalOverviewResponse | null> {
  const { tenantId, clientId } = params;
  return clientPrismaRepository.loadPatientPortalOverview(tenantId, clientId);
}
