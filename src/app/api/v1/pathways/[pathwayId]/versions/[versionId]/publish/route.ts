import { prisma } from "@/infrastructure/database/prisma";
import { deriveStagesFromGraph } from "@/lib/pathway/graph";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string; versionId: string }> };

export async function POST(_request: Request, ctx: RouteCtx) {
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

  const version = await prisma.pathwayVersion.findFirst({
    where: { id: versionId, pathwayId },
  });
  if (!version) {
    return jsonError("NOT_FOUND", "Versão não encontrada.", 404);
  }

  const stages = deriveStagesFromGraph(version.graphJson);
  if (stages.length === 0) {
    return jsonError(
      "VALIDATION_ERROR",
      "O grafo precisa ter ao menos um node (`nodes`) para publicar.",
      422,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.pathwayVersion.updateMany({
      where: { pathwayId, NOT: { id: versionId } },
      data: { published: false },
    });
    await tx.pathwayStage.deleteMany({
      where: { pathwayVersionId: versionId },
    });
    await tx.pathwayVersion.update({
      where: { id: versionId },
      data: { published: true },
    });
    await tx.pathwayStage.createMany({
      data: stages.map((s) => ({
        pathwayVersionId: versionId,
        stageKey: s.stageKey,
        name: s.name,
        sortOrder: s.sortOrder,
        patientMessage: s.patientMessage,
      })),
    });
  });

  const published = await prisma.pathwayVersion.findUnique({
    where: { id: versionId },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
    },
  });

  return jsonSuccess({
    version: {
      id: published!.id,
      pathwayId: published!.pathwayId,
      version: published!.version,
      published: published!.published,
      stages: published!.stages.map((s) => ({
        id: s.id,
        stageKey: s.stageKey,
        name: s.name,
        sortOrder: s.sortOrder,
        patientMessage: s.patientMessage,
      })),
    },
  });
}
