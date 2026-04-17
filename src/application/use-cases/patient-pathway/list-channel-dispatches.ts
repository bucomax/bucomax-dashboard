import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";

export async function listChannelDispatchesForPatientPathway(params: {
  tenantId: string;
  patientPathwayId: string;
}) {
  const { tenantId, patientPathwayId } = params;
  return patientPathwayPrismaRepository.listChannelDispatchesForPatientPathway(
    tenantId,
    patientPathwayId,
  );
}
