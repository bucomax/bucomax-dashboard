import { AuditEventType } from "@prisma/client";
import { revalidateTenantClientsList, revalidateTenantOpmeSuppliersList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";
import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";

export type DeleteClientResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "NOT_FOUND" };

/**
 * Remove paciente (soft delete): RBAC (super_admin ou tenant_admin), persistência, cache, auditoria.
 */
export async function runDeleteClient(params: {
  tenantId: string;
  actorUserId: string;
  clientDbId: string;
  isSuperAdmin: boolean;
}): Promise<DeleteClientResult> {
  const { tenantId, actorUserId, clientDbId, isSuperAdmin } = params;

  if (!isSuperAdmin) {
    const role = await userPrismaRepository.getTenantMembershipRole(tenantId, actorUserId);
    if (role !== "tenant_admin") {
      return { ok: false, code: "FORBIDDEN" };
    }
  }

  const deleted = await clientPrismaRepository.delete(tenantId, clientDbId, actorUserId);
  if (!deleted) {
    return { ok: false, code: "NOT_FOUND" };
  }

  revalidateTenantClientsList(tenantId);
  revalidateTenantOpmeSuppliersList(tenantId);

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId: clientDbId,
    patientPathwayId: null,
    actorUserId,
    eventType: AuditEventType.PATIENT_DELETED,
    payload: { clientId: clientDbId, deletedByUserId: actorUserId },
  });

  return { ok: true };
}
