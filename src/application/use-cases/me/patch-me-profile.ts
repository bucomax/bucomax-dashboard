import { userPrismaRepository } from "@/infrastructure/repositories/user.repository";

export type PatchMeProfileResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string | null;
        image: string | null;
        globalRole: string;
        emailVerified: Date | null;
      };
    }
  | { ok: false; code: "ACCOUNT_INVALID" | "NO_FIELDS_TO_UPDATE" };

export async function runPatchMeProfile(params: {
  sessionUserId: string;
  patch: { name?: string | null; image?: string | null };
}): Promise<PatchMeProfileResult> {
  const existing = await userPrismaRepository.findActiveByIdGlobal(params.sessionUserId);
  if (!existing) {
    return { ok: false, code: "ACCOUNT_INVALID" };
  }

  const data: { name?: string | null; image?: string | null } = {};
  if (params.patch.name !== undefined) data.name = params.patch.name;
  if (params.patch.image !== undefined) data.image = params.patch.image;

  if (Object.keys(data).length === 0) {
    return { ok: false, code: "NO_FIELDS_TO_UPDATE" };
  }

  const updated = await userPrismaRepository.updateUserProfile(params.sessionUserId, data);
  const u = updated as {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    globalRole: string;
    emailVerified: Date | null;
  };

  return {
    ok: true,
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      globalRole: u.globalRole,
      emailVerified: u.emailVerified,
    },
  };
}
