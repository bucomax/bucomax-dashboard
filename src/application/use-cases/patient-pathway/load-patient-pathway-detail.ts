import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";

export async function loadPatientPathwayDetail(params: { tenantId: string; patientPathwayId: string }) {
  const { tenantId, patientPathwayId } = params;
  return patientPathwayPrismaRepository.loadPatientPathwayDetailPayload(tenantId, patientPathwayId);
}
