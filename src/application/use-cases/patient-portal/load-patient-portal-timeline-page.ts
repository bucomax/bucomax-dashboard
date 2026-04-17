import { mergeClientTimelinePage } from "@/application/use-cases/client/load-client-timeline";
import { clientTimelinePrismaRepository } from "@/infrastructure/repositories/client-timeline.repository";
import type { ClientTimelineEventCategory } from "@/types/api/clients-v1";

export async function loadPatientPortalTimelinePage(params: {
  tenantId: string;
  clientId: string;
  page: number;
  limit: number;
  categoryFilter?: Set<ClientTimelineEventCategory> | null;
}) {
  const { tenantId, clientId, page, limit, categoryFilter } = params;
  const sources = await clientTimelinePrismaRepository.fetchMergeSources(tenantId, clientId);
  return mergeClientTimelinePage(sources, page, limit, { categoryFilter });
}
