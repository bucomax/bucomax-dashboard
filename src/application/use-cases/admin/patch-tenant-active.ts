import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

export async function runPatchTenantActive(params: { tenantId: string; isActive: boolean }) {
  return tenantPrismaRepository.updateTenantActive(params.tenantId, params.isActive);
}
