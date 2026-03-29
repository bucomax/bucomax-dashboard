import { prisma } from "@/infrastructure/database/prisma";
import type { ApiT } from "@/lib/api/i18n";
import { jsonError } from "@/lib/api-response";

export async function validateClientOptionalRefs(
  tenantId: string,
  refs: { assignedToUserId?: string | null; opmeSupplierId?: string | null },
  apiT: ApiT,
): Promise<Response | null> {
  if (refs.assignedToUserId) {
    const m = await prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId: refs.assignedToUserId, tenantId } },
      include: { user: { select: { deletedAt: true } } },
    });
    if (!m || m.user.deletedAt) {
      return jsonError("VALIDATION_ERROR", apiT("errors.invalidAssigneeForTenant"), 422);
    }
  }
  if (refs.opmeSupplierId) {
    const s = await prisma.opmeSupplier.findFirst({
      where: { id: refs.opmeSupplierId, tenantId, active: true },
      select: { id: true },
    });
    if (!s) {
      return jsonError("VALIDATION_ERROR", apiT("errors.invalidOpmeSupplier"), 422);
    }
  }
  return null;
}
