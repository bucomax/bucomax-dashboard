import { AuditEventType } from "@prisma/client";
import { revalidateTenantClientsList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";

export type CompletePatientPathwayResult =
  | {
      ok: true;
      patientPathway: {
        id: string;
        completedAt: string;
        client: { id: string; name: string };
        pathway: { id: string; name: string };
        currentStage: { id: string; name: string };
      };
    }
  | { ok: false; code: "NOT_FOUND" | "ALREADY_COMPLETED" };

export async function runCompletePatientPathway(params: {
  tenantId: string;
  actorUserId: string;
  patientPathwayId: string;
}): Promise<CompletePatientPathwayResult> {
  const { tenantId, actorUserId, patientPathwayId } = params;

  const pp = await patientPathwayPrismaRepository.findForCompletion(tenantId, patientPathwayId);
  if (!pp) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (pp.completedAt) {
    return { ok: false, code: "ALREADY_COMPLETED" };
  }

  const updated = await patientPathwayPrismaRepository.completePatientPathwayWithSnapshot(
    tenantId,
    patientPathwayId,
  );
  if (!updated) {
    return { ok: false, code: "ALREADY_COMPLETED" };
  }

  revalidateTenantClientsList(tenantId);

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId: pp.clientId,
    patientPathwayId: updated.id,
    actorUserId,
    eventType: AuditEventType.PATIENT_PATHWAY_COMPLETED,
    payload: { patientPathwayId: updated.id },
  });

  return {
    ok: true,
    patientPathway: {
      id: updated.id,
      completedAt: updated.completedAt.toISOString(),
      client: updated.client,
      pathway: updated.pathway,
      currentStage: updated.currentStage,
    },
  };
}
