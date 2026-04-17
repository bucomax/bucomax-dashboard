import type { CreateOpmeSupplierResult } from "@/application/ports/opme-supplier-repository.port";
import { revalidateTenantOpmeSuppliersList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { opmeSupplierPrismaRepository } from "@/infrastructure/repositories/opme-supplier.repository";

export type { CreateOpmeSupplierResult };

export async function runCreateOpmeSupplier(params: {
  tenantId: string;
  name: string;
}): Promise<CreateOpmeSupplierResult> {
  const result = await opmeSupplierPrismaRepository.createIfUniqueName(params.tenantId, params.name);
  if (result.ok) {
    revalidateTenantOpmeSuppliersList(params.tenantId);
  }
  return result;
}
