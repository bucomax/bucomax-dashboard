import type { NotificationType } from "@prisma/client";
import { TenantRole } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";

function uniqueUserIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

async function listAllTenantMemberUserIds(tenantId: string): Promise<string[]> {
  const rows = await prisma.tenantMembership.findMany({
    where: { tenantId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

async function listTenantAdminUserIds(tenantId: string): Promise<string[]> {
  const rows = await prisma.tenantMembership.findMany({
    where: { tenantId, role: TenantRole.tenant_admin },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

async function isMemberOfTenant(tenantId: string, userId: string): Promise<boolean> {
  const row = await prisma.tenantMembership.findFirst({
    where: { tenantId, userId },
    select: { userId: true },
  });
  return row != null;
}

/**
 * Fase 2: destinatários in-app para eventos ligados a uma instância de jornada (`PatientPathway`).
 *
 * - Com `currentStageAssigneeUserId` válido no tenant: normalmente só o responsável da etapa.
 * - `sla_critical`: responsável + todos os `tenant_admin` (deduplicado).
 * - Sem assignee ou ID inválido: todos os membros (comportamento legado).
 */
export async function resolvePathwayNotificationTargetUserIds(args: {
  tenantId: string;
  type: NotificationType;
  currentStageAssigneeUserId: string | null;
}): Promise<string[]> {
  const allMembers = await listAllTenantMemberUserIds(args.tenantId);
  const assigneeId = args.currentStageAssigneeUserId;
  if (!assigneeId) {
    return allMembers;
  }
  const ok = await isMemberOfTenant(args.tenantId, assigneeId);
  if (!ok) {
    return allMembers;
  }
  if (args.type === "sla_critical") {
    const admins = await listTenantAdminUserIds(args.tenantId);
    return uniqueUserIds([assigneeId, ...admins]);
  }
  return [assigneeId];
}
