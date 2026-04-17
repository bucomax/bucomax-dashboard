import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";

export type GetMeProfileResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string | null;
        image: string | null;
        emailVerified: Date | null;
        globalRole: string;
        tenantId: string | null;
        tenantRole: string | null;
        createdAt: Date;
      };
    }
  | { ok: false; code: "ACCOUNT_INVALID" };

export async function getMeProfile(sessionUserId: string): Promise<GetMeProfileResult> {
  const userRow = await userPrismaRepository.findActiveByIdGlobal(sessionUserId);
  if (!userRow || typeof userRow !== "object") {
    return { ok: false, code: "ACCOUNT_INVALID" };
  }
  const user = userRow as {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    globalRole: string;
    emailVerified: Date | null;
    activeTenantId: string | null;
    createdAt: Date;
  };

  const membership = user.activeTenantId
    ? await userPrismaRepository.findMembershipForUser(user.id, user.activeTenantId)
    : null;

  let tenantId: string | null = null;
  let tenantRole: string | null = null;

  const m = membership as { tenantId: string; role: string } | null;
  if (m) {
    tenantId = m.tenantId;
    tenantRole = m.role;
  } else if (user.globalRole === "super_admin" && user.activeTenantId) {
    tenantId = user.activeTenantId;
    tenantRole = null;
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      globalRole: user.globalRole,
      tenantId,
      tenantRole,
      createdAt: user.createdAt,
    },
  };
}
