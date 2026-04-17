import bcrypt from "bcryptjs";
import { AuditEventType } from "@prisma/client";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";

export type SetPatientPortalSessionPasswordResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "CURRENT_REQUIRED" | "CURRENT_WRONG" };

export async function runSetPatientPortalSessionPassword(params: {
  tenantId: string;
  clientId: string;
  newPassword: string;
  currentPassword: string | undefined;
}): Promise<SetPatientPortalSessionPasswordResult> {
  const { tenantId, clientId, newPassword, currentPassword } = params;

  const row = await clientPrismaRepository.findClientPortalPasswordRow(tenantId, clientId);
  if (!row) {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (row.portalPasswordHash) {
    if (!currentPassword?.trim()) {
      return { ok: false, code: "CURRENT_REQUIRED" };
    }
    const match = await bcrypt.compare(currentPassword, row.portalPasswordHash);
    if (!match) {
      return { ok: false, code: "CURRENT_WRONG" };
    }
  }

  const portalPasswordHash = await bcrypt.hash(newPassword, 12);
  const portalPasswordChangedAt = new Date();
  await clientPrismaRepository.updatePatientPortalPasswordHash(
    row.id,
    portalPasswordHash,
    portalPasswordChangedAt,
  );

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId: row.id,
    patientPathwayId: null,
    actorUserId: null,
    eventType: AuditEventType.PATIENT_PORTAL_PASSWORD_SET,
    payload: { clientId: row.id, source: "portal_session" },
  });

  return { ok: true };
}
