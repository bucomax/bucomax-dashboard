import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

export async function listTenantMembersForPicker(params: { tenantId: string }) {
  const rows = await tenantPrismaRepository.listActiveTenantMembershipRows(params.tenantId);
  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    name: r.name,
  }));
}
