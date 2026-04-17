import type { Session } from "next-auth";

import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";
import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";
import { requireSuperAdmin } from "@/lib/auth/guards";

export type SwitchActiveTenantResult =
  | {
      ok: true;
      tenantId: string;
      tenantRole: string | null;
    }
  | { ok: false; code: "TENANT_NOT_FOUND" | "TENANT_INACTIVE" | "FORBIDDEN" };

export async function runSwitchActiveTenant(params: {
  session: Session;
  tenantId: string;
}): Promise<SwitchActiveTenantResult> {
  const { session, tenantId } = params;
  const userId = session.user.id;

  const tenant = await tenantPrismaRepository.findTenantSwitchStatus(tenantId);
  if (!tenant) {
    return { ok: false, code: "TENANT_NOT_FOUND" };
  }
  if (!tenant.isActive) {
    return { ok: false, code: "TENANT_INACTIVE" };
  }

  const membershipRole = await userPrismaRepository.getTenantMembershipRole(tenantId, userId);

  if (!membershipRole && !requireSuperAdmin(session)) {
    return { ok: false, code: "FORBIDDEN" };
  }

  await userPrismaRepository.setActiveTenantId(userId, tenantId);

  return {
    ok: true,
    tenantId,
    tenantRole: membershipRole ?? null,
  };
}
