import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";

export async function listClientNotesPage(params: {
  tenantId: string;
  clientId: string;
  page: number;
  limit: number;
}) {
  const { tenantId, clientId, page, limit } = params;
  return clientPrismaRepository.listPatientNotesPage(tenantId, clientId, page, limit);
}
