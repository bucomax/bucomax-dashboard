import { Prisma, TenantRole } from "@prisma/client";

import { opmeSupplierPrismaRepository } from "@/infrastructure/repositories/opme-supplier.repository";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";
import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";
import { patchMemberRoleBodySchema } from "@/lib/validators/profile";
import type { z } from "zod";

export type PatchMemberRoleBody = z.infer<typeof patchMemberRoleBodySchema>;

export type UpdateTenantMemberResult =
  | {
      ok: true;
      member: {
        userId: string;
        tenantId: string;
        role: string;
        restrictedToAssignedOnly: boolean;
        linkedOpmeSupplierId: string | null;
      };
    }
  | { ok: false; code: "TENANT_NOT_FOUND" | "MEMBER_NOT_FOUND" | "USER_NOT_FOUND" | "OPME_NOT_FOUND" | "LAST_ADMIN" };

export async function runUpdateTenantMember(params: {
  tenantId: string;
  userId: string;
  body: PatchMemberRoleBody;
}): Promise<UpdateTenantMemberResult> {
  const { tenantId, userId, body: parsed } = params;

  const tenant = await tenantPrismaRepository.findById(tenantId);
  if (!tenant) {
    return { ok: false, code: "TENANT_NOT_FOUND" };
  }

  const newRole =
    parsed.role === "tenant_admin" ? TenantRole.tenant_admin : TenantRole.tenant_user;

  const updateData: Prisma.TenantMembershipUpdateInput = {
    role: newRole,
  };

  if (newRole === TenantRole.tenant_admin) {
    updateData.restrictedToAssignedOnly = false;
    updateData.linkedOpmeSupplier = { disconnect: true };
  } else {
    if (parsed.restrictedToAssignedOnly !== undefined) {
      updateData.restrictedToAssignedOnly = parsed.restrictedToAssignedOnly;
    }
    if (parsed.linkedOpmeSupplierId !== undefined) {
      if (parsed.linkedOpmeSupplierId === null) {
        updateData.linkedOpmeSupplier = { disconnect: true };
      } else {
        const supplier = await opmeSupplierPrismaRepository.findById(tenantId, parsed.linkedOpmeSupplierId);
        if (!supplier) {
          return { ok: false, code: "OPME_NOT_FOUND" };
        }
        updateData.linkedOpmeSupplier = { connect: { id: parsed.linkedOpmeSupplierId } };
      }
    }
  }

  const membership = await tenantPrismaRepository.findMembership(tenantId, userId);
  if (!membership || typeof membership !== "object") {
    return { ok: false, code: "MEMBER_NOT_FOUND" };
  }
  const m = membership as { id: string; role: string };

  const targetUser = await userPrismaRepository.findActiveByIdGlobal(userId);
  if (!targetUser) {
    return { ok: false, code: "USER_NOT_FOUND" };
  }

  if (m.role === TenantRole.tenant_admin && newRole === TenantRole.tenant_user) {
    const admins = await tenantPrismaRepository.countTenantAdmins(tenantId);
    if (admins <= 1) {
      return { ok: false, code: "LAST_ADMIN" };
    }
  }

  const updated = await tenantPrismaRepository.updateTenantMembership(m.id, updateData);
  const u = updated as {
    userId: string;
    tenantId: string;
    role: string;
    restrictedToAssignedOnly: boolean;
    linkedOpmeSupplierId: string | null;
  };

  return {
    ok: true,
    member: {
      userId: u.userId,
      tenantId: u.tenantId,
      role: u.role,
      restrictedToAssignedOnly: u.restrictedToAssignedOnly,
      linkedOpmeSupplierId: u.linkedOpmeSupplierId,
    },
  };
}
