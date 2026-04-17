import { revalidateTenantPathwaysList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { pathwayPrismaRepository } from "@/infrastructure/repositories/pathway.repository";

export async function runCreateCarePathway(params: {
  tenantId: string;
  name: string;
  description?: string | null;
}) {
  const row = await pathwayPrismaRepository.createCarePathway({
    tenantId: params.tenantId,
    name: params.name,
    description: params.description,
  });

  revalidateTenantPathwaysList(params.tenantId);

  const r = row as { id: string; name: string; description: string | null; createdAt: Date; updatedAt: Date };
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
