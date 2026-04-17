import type { CreateTenantResult } from "@/application/ports/tenant-repository.port";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

export type { CreateTenantResult };

export async function runCreateTenant(params: { name: string; slug: string }): Promise<CreateTenantResult> {
  return tenantPrismaRepository.createTenant(params);
}
