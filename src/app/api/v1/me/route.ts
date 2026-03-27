import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401 } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { patchMeBodySchema } from "@/lib/validators/profile";

export const dynamic = "force-dynamic";

async function getActiveUserOr401(sessionUserId: string) {
  const user = await prisma.user.findFirst({
    where: { id: sessionUserId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      globalRole: true,
      emailVerified: true,
      activeTenantId: true,
      createdAt: true,
    },
  });
  if (!user) {
    return { user: null, response: jsonError("UNAUTHORIZED", "Conta inválida ou desativada.", 401) };
  }
  return { user, response: null };
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return jsonError("UNAUTHORIZED", "Sessão ausente ou inválida.", 401);
  }

  const { user, response } = await getActiveUserOr401(session.user.id);
  if (response) return response;

  const membership = user.activeTenantId
    ? await prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: { userId: user.id, tenantId: user.activeTenantId },
        },
      })
    : null;

  let tenantId: string | null = null;
  let tenantRole: string | null = null;

  if (membership) {
    tenantId = membership.tenantId;
    tenantRole = membership.role;
  } else if (user.globalRole === "super_admin" && user.activeTenantId) {
    tenantId = user.activeTenantId;
    tenantRole = null;
  }

  return jsonSuccess({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      globalRole: user.globalRole,
      tenantId,
      tenantRole,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = patchMeBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { user, response } = await getActiveUserOr401(auth.session!.user.id);
  if (response) return response;

  const data: { name?: string | null; image?: string | null } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.image !== undefined) {
    data.image = parsed.data.image === "" || parsed.data.image === null ? null : parsed.data.image;
  }

  if (Object.keys(data).length === 0) {
    return jsonError("VALIDATION_ERROR", "Nenhum campo para atualizar.", 422);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      globalRole: true,
      emailVerified: true,
    },
  });

  return jsonSuccess({ user: updated });
}

/** Soft delete da própria conta (invalida sessões persistidas no Prisma Adapter). */
export async function DELETE() {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const { user, response } = await getActiveUserOr401(auth.session!.user.id);
  if (response) return response;

  const now = new Date();
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: now },
    }),
  ]);

  return jsonSuccess({ message: "Conta desativada." });
}
