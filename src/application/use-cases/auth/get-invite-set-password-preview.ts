import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";
import type { InviteSetPasswordPreviewDto } from "@/types/api/auth-v1";

/**
 * Metadados públicos para a tela de definir senha (convite). Retorna `null` se o token não for válido.
 */
export async function runGetInviteSetPasswordPreview(
  token: string,
): Promise<InviteSetPasswordPreviewDto | null> {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }
  return userPrismaRepository.findInviteSetPasswordPreview(trimmed);
}
