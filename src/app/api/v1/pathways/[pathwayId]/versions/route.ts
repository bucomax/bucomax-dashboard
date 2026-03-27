import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { postPathwayVersionBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const t = getActiveTenantIdOr400(auth.session!);
  if (t.response) return t.response;

  const { pathwayId } = await ctx.params;

  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId: t.tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return jsonError("NOT_FOUND", "Jornada não encontrada.", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = postPathwayVersionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const last = await prisma.pathwayVersion.findFirst({
    where: { pathwayId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const row = await prisma.pathwayVersion.create({
    data: {
      pathwayId,
      version: nextVersion,
      graphJson: parsed.data.graphJson as object,
      published: false,
    },
    select: {
      id: true,
      pathwayId: true,
      version: true,
      published: true,
      createdAt: true,
    },
  });

  return jsonSuccess(
    {
      version: {
        ...row,
        createdAt: row.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
