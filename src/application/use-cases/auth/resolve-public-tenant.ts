import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

/** Tenant ativo para rotas públicas com `Tenant.slug` na URL (case-insensitive). */
export async function findActiveTenantBySlug(slug: string) {
  return tenantPrismaRepository.findActiveBySlugCaseInsensitive(slug);
}
