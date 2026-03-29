import { prisma } from "@/infrastructure/database/prisma";
import { deriveStagesFromGraph } from "@/lib/pathway/graph";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string; versionId: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId, versionId } = await ctx.params;

  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId: tenantCtx.tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }

  const version = await prisma.pathwayVersion.findFirst({
    where: { id: versionId, pathwayId },
  });
  if (!version) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayVersionNotFound"), 404);
  }

  const stages = deriveStagesFromGraph(version.graphJson);
  if (stages.length === 0) {
    return jsonError("VALIDATION_ERROR", apiT("errors.graphNeedsAtLeastOneNode"), 422);
  }

  const newStageKeys = new Set(stages.map((s) => s.stageKey));

  const oldPublished = await prisma.pathwayVersion.findFirst({
    where: { pathwayId, published: true, NOT: { id: versionId } },
    include: {
      stages: {
        include: {
          _count: { select: { currentPatients: true, transitionsTo: true } },
        },
      },
    },
  });

  const oldStagesByKey = new Map(
    oldPublished?.stages.map((s) => [s.stageKey, s]) ?? [],
  );

  const removedWithPatients = oldPublished?.stages.filter(
    (s) => !newStageKeys.has(s.stageKey) && s._count.currentPatients > 0,
  ) ?? [];

  if (removedWithPatients.length > 0) {
    const names = removedWithPatients.map((s) => s.name).join(", ");
    return jsonError("CONFLICT", apiT("errors.stagesHavePatients", { stages: names }), 409);
  }

  await prisma.$transaction(async (tx) => {
    await tx.pathwayStage.deleteMany({ where: { pathwayVersionId: versionId } });

    await tx.pathwayVersion.updateMany({
      where: { pathwayId, NOT: { id: versionId } },
      data: { published: false },
    });
    await tx.pathwayVersion.update({
      where: { id: versionId },
      data: { published: true },
    });

    for (const stage of stages) {
      const existing = oldStagesByKey.get(stage.stageKey);
      if (existing) {
        await tx.pathwayStage.update({
          where: { id: existing.id },
          data: {
            pathwayVersionId: versionId,
            name: stage.name,
            sortOrder: stage.sortOrder,
            patientMessage: stage.patientMessage,
            alertWarningDays: stage.alertWarningDays,
            alertCriticalDays: stage.alertCriticalDays,
          },
        });
        await tx.pathwayStageChecklistItem.deleteMany({ where: { pathwayStageId: existing.id } });
      } else {
        await tx.pathwayStage.create({
          data: {
            pathwayVersionId: versionId,
            stageKey: stage.stageKey,
            name: stage.name,
            sortOrder: stage.sortOrder,
            patientMessage: stage.patientMessage,
            alertWarningDays: stage.alertWarningDays,
            alertCriticalDays: stage.alertCriticalDays,
          },
        });
      }
    }

    const removedStageIds = [...oldStagesByKey.entries()]
      .filter(([key]) => !newStageKeys.has(key))
      .map(([, s]) => s.id);

    if (removedStageIds.length > 0) {
      await tx.stageTransition.deleteMany({
        where: { OR: [{ fromStageId: { in: removedStageIds } }, { toStageId: { in: removedStageIds } }] },
      });
      await tx.pathwayStage.deleteMany({ where: { id: { in: removedStageIds } } });
    }

    const allStages = await tx.pathwayStage.findMany({
      where: { pathwayVersionId: versionId },
      select: { id: true, stageKey: true },
    });
    const stageIdByKey = new Map(allStages.map((s) => [s.stageKey, s.id]));

    const checklistRows = stages.flatMap((stage) => {
      const pathwayStageId = stageIdByKey.get(stage.stageKey);
      if (!pathwayStageId) return [];
      return stage.checklistItems.map((item) => ({
        pathwayStageId,
        label: item.label,
        sortOrder: item.sortOrder,
      }));
    });
    if (checklistRows.length > 0) {
      await tx.pathwayStageChecklistItem.createMany({ data: checklistRows });
    }

    if (oldPublished) {
      await tx.patientPathway.updateMany({
        where: { pathwayVersionId: oldPublished.id },
        data: { pathwayVersionId: versionId },
      });
    }
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
        alertWarningDays: s.alertWarningDays,
        alertCriticalDays: s.alertCriticalDays,
      })),
    },
  });
}
