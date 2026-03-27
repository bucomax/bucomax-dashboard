import { TenantRole } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { assertTenantAdminOrSuper, requireSessionOr401 } from "@/lib/auth/guards";
import { patchMemberRoleBodySchema } from "@/lib/validators/profile";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ tenantId: string; userId: string }> };

async function countAdmins(tenantId: string) {
  return prisma.tenantMembership.count({
    where: { tenantId, role: TenantRole.tenant_admin },
  });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const { tenantId, userId } = await ctx.params;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return jsonError("NOT_FOUND", "Tenant não encontrado.", 404);
  }

  const forbidden = await assertTenantAdminOrSuper(auth.session!, tenantId);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = patchMemberRoleBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const newRole = parsed.data.role === "tenant_admin" ? TenantRole.tenant_admin : TenantRole.tenant_user;

  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
  if (!membership) {
    return jsonError("NOT_FOUND", "Membro não encontrado neste tenant.", 404);
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!targetUser) {
    return jsonError("NOT_FOUND", "Usuário não encontrado.", 404);
  }

  if (membership.role === TenantRole.tenant_admin && newRole === TenantRole.tenant_user) {
    const admins = await countAdmins(tenantId);
    if (admins <= 1) {
      return jsonError(
        "CONFLICT",
        "O tenant deve ter ao menos um administrador. Promova outro membro antes.",
        409,
      );
    }
  }

  const updated = await prisma.tenantMembership.update({
    where: { id: membership.id },
    data: { role: newRole },
  });

  return jsonSuccess({
    member: {
      userId: updated.userId,
      tenantId: updated.tenantId,
      role: updated.role,
    },
  });
}

/** Remove apenas a membership (não apaga o usuário global). */
export async function DELETE(_request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const { tenantId, userId } = await ctx.params;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return jsonError("NOT_FOUND", "Tenant não encontrado.", 404);
  }

  const forbidden = await assertTenantAdminOrSuper(auth.session!, tenantId);
  if (forbidden) return forbidden;

  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
  if (!membership) {
    return jsonError("NOT_FOUND", "Membro não encontrado neste tenant.", 404);
  }

  if (membership.role === TenantRole.tenant_admin) {
    const admins = await countAdmins(tenantId);
    if (admins <= 1) {
      return jsonError(
        "CONFLICT",
        "Não é possível remover o único administrador do tenant.",
        409,
      );
    }
  }

  await prisma.tenantMembership.delete({
    where: { id: membership.id },
  });

  await prisma.user.updateMany({
    where: { id: userId, activeTenantId: tenantId },
    data: { activeTenantId: null },
  });

  return jsonSuccess({ message: "Membro removido do tenant." });
}
