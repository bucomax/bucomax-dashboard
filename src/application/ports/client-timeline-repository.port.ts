import type { ClientTimelineMergeSources } from "@/types/api/clients-v1";

export interface IClientTimelineRepository {
  fetchMergeSources(tenantId: string, clientId: string): Promise<ClientTimelineMergeSources>;
}
