import type { ParsedPortalLogin } from "@/domain/auth/patient-portal-login-identifier";
import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";
import type { PortalClientForLogin } from "@/types/api/patient-portal-v1";

export async function findClientForPortalLogin(
  tenantId: string,
  parsed: ParsedPortalLogin,
): Promise<PortalClientForLogin | null> {
  return clientPrismaRepository.findForPortalLogin(tenantId, parsed);
}
