import {
  loadClientDetailResponseData,
  sanitizeClientDetailForPatientPortal,
  type ClientDetailClientRow,
} from "@/application/use-cases/client/load-client-detail";
import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

export async function loadPatientPortalDetailPayload(params: {
  tenantId: string;
  clientId: string;
  page: number;
  limit: number;
}) {
  const { tenantId, clientId, page, limit } = params;

  const raw = await clientPrismaRepository.findClientForPatientPortalDetail(tenantId, clientId);
  if (!raw) return null;

  const row = raw as ClientDetailClientRow & { portalPasswordHash: string | null };
  const hasPortalPassword = row.portalPasswordHash != null;
  const { portalPasswordHash, ...detailRow } = row;
  void portalPasswordHash;

  const [payload, tenantMeta] = await Promise.all([
    loadClientDetailResponseData(tenantId, detailRow as ClientDetailClientRow, page, limit),
    tenantPrismaRepository.findTenantNameAndSlugById(tenantId),
  ]);

  return {
    body: {
      ...sanitizeClientDetailForPatientPortal(payload),
      tenant: { name: tenantMeta?.name ?? "—" },
      hasPortalPassword,
    },
  };
}
