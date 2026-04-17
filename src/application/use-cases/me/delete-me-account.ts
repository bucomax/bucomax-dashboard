import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";

export type DeleteMeAccountResult = { ok: true } | { ok: false; code: "ACCOUNT_INVALID" };

export async function runDeleteMeAccount(sessionUserId: string): Promise<DeleteMeAccountResult> {
  const existing = await userPrismaRepository.findActiveByIdGlobal(sessionUserId);
  if (!existing) {
    return { ok: false, code: "ACCOUNT_INVALID" };
  }

  await userPrismaRepository.softDeleteUserAndSessions(sessionUserId);
  return { ok: true };
}
