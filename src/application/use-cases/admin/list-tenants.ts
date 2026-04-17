import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

export async function listAllTenantsForSuperAdmin() {
  return tenantPrismaRepository.listTenantSummariesForSuperAdmin();
}
