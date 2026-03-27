import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { patchPathwayVersionBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string; versionId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const t = getActiveTenantIdOr400(auth.session!);
  if (t.response) return t.response;

  const { pathwayId, versionId } = await ctx.params;

  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId: t.tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return jsonError("NOT_FOUND", "Jornada não encontrada.", 404);
  }

  const row = await prisma.pathwayVersion.findFirst({
    where: { id: versionId, pathwayId },
  });
  if (!row) {
    return jsonError("NOT_FOUND", "Versão não encontrada.", 404);
  }

  return jsonSuccess({
    version: {
      id: row.id,
      pathwayId: row.pathwayId,
      version: row.version,
      published: row.published,
      graphJson: row.graphJson,
      createdAt: row.createdAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const t = getActiveTenantIdOr400(auth.session!);
  if (t.response) return t.response;

  const { pathwayId, versionId } = await ctx.params;

  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId: t.tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return jsonError("NOT_FOUND", "Jornada não encontrada.", 404);
  }

  const existing = await prisma.pathwayVersion.findFirst({
    where: { id: versionId, pathwayId },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", "Versão não encontrada.", 404);
  }

  if (existing.published) {
    return jsonError(
      "CONFLICT",
      "Versão publicada não pode ser editada. Crie uma nova versão.",
      409,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = patchPathwayVersionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const row = await prisma.pathwayVersion.update({
    where: { id: versionId },
    data: { graphJson: parsed.data.graphJson as object },
    select: {
      id: true,
      pathwayId: true,
      version: true,
      published: true,
      graphJson: true,
      createdAt: true,
    },
  });

  return jsonSuccess({
    version: {
      id: row.id,
      pathwayId: row.pathwayId,
      version: row.version,
      published: row.published,
      graphJson: row.graphJson,
      createdAt: row.createdAt.toISOString(),
    },
  });
}
