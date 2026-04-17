import { TenantRole } from "@prisma/client";

import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

export type RemoveTenantMemberResult =
  | { ok: true }
  | { ok: false; code: "TENANT_NOT_FOUND" | "MEMBER_NOT_FOUND" | "LAST_ADMIN" };

export async function runRemoveTenantMember(params: {
  tenantId: string;
  userId: string;
}): Promise<RemoveTenantMemberResult> {
  const { tenantId, userId } = params;

  const tenant = await tenantPrismaRepository.findById(tenantId);
  if (!tenant) {
    return { ok: false, code: "TENANT_NOT_FOUND" };
  }

  const membership = await tenantPrismaRepository.findMembership(tenantId, userId);
  if (!membership || typeof membership !== "object") {
    return { ok: false, code: "MEMBER_NOT_FOUND" };
  }
  const m = membership as { id: string; role: string };

  if (m.role === TenantRole.tenant_admin) {
    const admins = await tenantPrismaRepository.countTenantAdmins(tenantId);
    if (admins <= 1) {
      return { ok: false, code: "LAST_ADMIN" };
    }
  }

  await tenantPrismaRepository.deleteTenantMembership(m.id);
  await tenantPrismaRepository.clearUserActiveTenantIfMatches(userId, tenantId);

  return { ok: true };
}
