import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";

export async function createClientNote(params: {
  tenantId: string;
  clientId: string;
  authorUserId: string;
  content: string;
}) {
  return clientPrismaRepository.createPatientNote(params);
}
