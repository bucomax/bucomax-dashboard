import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { assertTenantAdminOrSuper, requireSessionOr401 } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ tenantId: string }> };

/** Lista membros ativos do tenant (usuário não deletado). */
export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const { tenantId } = await ctx.params;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  const forbidden = await assertTenantAdminOrSuper(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  const rows = await prisma.tenantMembership.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { user: { email: "asc" } },
  });

  const members = rows
    .filter((r) => r.user.deletedAt === null)
    .map((r) => ({
      userId: r.userId,
      email: r.user.email,
      name: r.user.name,
      image: r.user.image,
      role: r.role,
    }));

  return jsonSuccess({ members });
}
