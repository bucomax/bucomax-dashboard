import { createHash } from "node:crypto";

import { AuditEventType } from "@prisma/client";

import { recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { prisma } from "@/infrastructure/database/prisma";

function emailHashHex(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

async function activeTenantIdForUser(userId: string): Promise<string | null> {
  const u = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { activeTenantId: true },
  });
  return u?.activeTenantId ?? null;
}

export async function recordStaffLoginSuccess(userId: string): Promise<void> {
  const tenantId = await activeTenantIdForUser(userId);
  if (!tenantId) return;
  await recordAuditEvent(prisma, {
    tenantId,
    clientId: null,
    patientPathwayId: null,
    actorUserId: userId,
    type: AuditEventType.STAFF_LOGIN_SUCCESS,
    payload: { userId, method: "credentials" },
  });
}

export async function recordStaffLoginFailed(
  email: string,
  reason: "invalid_credentials" | "no_password",
  userId: string | null,
): Promise<void> {
  if (!userId) return;
  const tenantId = await activeTenantIdForUser(userId);
  if (!tenantId) return;
  await recordAuditEvent(prisma, {
    tenantId,
    clientId: null,
    patientPathwayId: null,
    actorUserId: userId,
    type: AuditEventType.STAFF_LOGIN_FAILED,
    payload: { emailHash: emailHashHex(email), reason },
  });
}
