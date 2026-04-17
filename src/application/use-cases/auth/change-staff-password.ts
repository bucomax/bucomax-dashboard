import bcrypt from "bcryptjs";
import { AuditEventType } from "@prisma/client";

import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";

export type ChangeStaffPasswordResult =
  | { ok: true }
  | { ok: false; code: "NO_LOCAL_PASSWORD" | "WRONG_CURRENT_PASSWORD" };

export async function runChangeStaffPassword(params: {
  userId: string;
  tenantId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<ChangeStaffPasswordResult> {
  const { userId, tenantId, currentPassword, newPassword } = params;

  const user = await userPrismaRepository.findActiveUserPasswordHash(userId);
  if (!user?.passwordHash) {
    return { ok: false, code: "NO_LOCAL_PASSWORD" };
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    return { ok: false, code: "WRONG_CURRENT_PASSWORD" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await userPrismaRepository.updateUserPasswordHash(user.id, passwordHash);

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId: null,
    patientPathwayId: null,
    actorUserId: user.id,
    eventType: AuditEventType.STAFF_PASSWORD_CHANGED,
    payload: { userId: user.id },
  });

  return { ok: true };
}
