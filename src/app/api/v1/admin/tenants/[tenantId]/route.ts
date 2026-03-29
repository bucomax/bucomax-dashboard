import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { requireSessionOr401, superAdminOr403 } from "@/lib/auth/guards";
import { patchAdminTenantBodySchema } from "@/lib/validators/tenant";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ tenantId: string }> };

/** Ativa/desativa tenant globalmente. Apenas `super_admin`. Ao desativar, remove contexto ativo de usuários presos a este tenant. */
export async function PATCH(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const forbidden = await superAdminOr403(auth.session!, request, apiT);
  if (forbidden) return forbidden;

  const { tenantId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patchAdminTenantBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  const { isActive } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { isActive },
    });
    if (!isActive) {
      await tx.user.updateMany({
        where: { activeTenantId: tenantId },
        data: { activeTenantId: null },
      });
    }
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  return jsonSuccess({ tenant });
}
