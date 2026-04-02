import type { PrismaClient } from "@prisma/client";

/**
 * Responsável da instância: primeiro membro do tenant entre os padrões da etapa (ordem preservada),
 * senão o responsável do cadastro do cliente; ignora IDs sem membership no tenant.
 */
export async function resolvePatientPathwayStageAssigneeUserId(
  db: Pick<PrismaClient, "tenantMembership">,
  tenantId: string,
  stage: { defaultAssigneeUserIds: string[]; defaultAssigneeUserId: string | null },
  clientAssignedToUserId: string | null,
): Promise<string | null> {
  const ordered =
    stage.defaultAssigneeUserIds.length > 0
      ? stage.defaultAssigneeUserIds
      : stage.defaultAssigneeUserId
        ? [stage.defaultAssigneeUserId]
        : [];
  for (const candidate of ordered) {
    const ok = await db.tenantMembership.findFirst({
      where: { tenantId, userId: candidate },
      select: { userId: true },
    });
    if (ok) return candidate;
  }
  if (!clientAssignedToUserId) return null;
  const clientOk = await db.tenantMembership.findFirst({
    where: { tenantId, userId: clientAssignedToUserId },
    select: { userId: true },
  });
  return clientOk ? clientAssignedToUserId : null;
}

/**
 * Garante que cada userId pertence ao tenant (via membership). Usado na publicação da jornada.
 */
export async function assertStageDefaultAssigneesInTenant(
  db: Pick<PrismaClient, "tenantMembership">,
  tenantId: string,
  assigneeUserIds: (string | null | undefined)[],
): Promise<{ ok: true } | { ok: false; invalidUserId: string }> {
  const unique = [
    ...new Set(
      assigneeUserIds.filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  if (unique.length === 0) {
    return { ok: true };
  }
  const rows = await db.tenantMembership.findMany({
    where: { tenantId, userId: { in: unique } },
    select: { userId: true },
  });
  const allowed = new Set(rows.map((r) => r.userId));
  for (const id of unique) {
    if (!allowed.has(id)) {
      return { ok: false, invalidUserId: id };
    }
  }
  return { ok: true };
}
