import type { ApiT } from "@/lib/api/i18n";
import { jsonError } from "@/lib/api-response";
import { opmeSupplierPrismaRepository } from "@/infrastructure/repositories/opme-supplier.repository";
import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";

export async function validateClientOptionalRefs(
  tenantId: string,
  refs: { assignedToUserId?: string | null; opmeSupplierId?: string | null },
  apiT: ApiT,
): Promise<Response | null> {
  if (refs.assignedToUserId) {
    const u = await userPrismaRepository.findById(tenantId, refs.assignedToUserId);
    if (!u) {
      return jsonError("VALIDATION_ERROR", apiT("errors.invalidAssigneeForTenant"), 422);
    }
  }
  if (refs.opmeSupplierId) {
    const s = await opmeSupplierPrismaRepository.findById(tenantId, refs.opmeSupplierId);
    const row = s as { active?: boolean } | null;
    if (!row || row.active === false) {
      return jsonError("VALIDATION_ERROR", apiT("errors.invalidOpmeSupplier"), 422);
    }
  }
  return null;
}
