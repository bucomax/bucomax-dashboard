import type { Prisma } from "@prisma/client";

import type { deriveStagesFromGraph } from "@/domain/pathway/graph-normalizer";

export type DerivedPathwayStage = ReturnType<typeof deriveStagesFromGraph>[number];

/**
 * Corpo persistido da publicação de uma versão de pathway (stages, checklist, docs, migração de pacientes).
 * Deve ser executado dentro de `prisma.$transaction`.
 */
export async function runPublishPathwayVersionTransaction(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    pathwayId: string;
    versionId: string;
    stages: DerivedPathwayStage[];
    /** Etapas da versão publicada anterior (mesmo `stageKey` pode ser reaproveitado). */
    oldStagesByKey: Map<string, { id: string; stageKey: string }>;
    /** Versão publicada anterior (pacientes ativos serão migrados para `versionId`). */
    oldPublished: { id: string } | null;
  },
): Promise<void> {
  const { tenantId, pathwayId, versionId, stages, oldStagesByKey, oldPublished } = input;
  const newStageKeys = new Set(stages.map((s) => s.stageKey));

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
          defaultAssigneeUserId: stage.defaultAssigneeUserId,
          defaultAssigneeUserIds: stage.defaultAssigneeUserIds,
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
          defaultAssigneeUserId: stage.defaultAssigneeUserId,
          defaultAssigneeUserIds: stage.defaultAssigneeUserIds,
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
      requiredForTransition: item.requiredForTransition,
    }));
  });
  if (checklistRows.length > 0) {
    await tx.pathwayStageChecklistItem.createMany({ data: checklistRows });
  }

  for (const stage of stages) {
    const pathwayStageId = stageIdByKey.get(stage.stageKey);
    if (!pathwayStageId) continue;
    await tx.stageDocument.deleteMany({ where: { pathwayStageId } });
    let docOrder = 0;
    for (const fileAssetId of stage.documentFileAssetIds) {
      const fileOk = await tx.fileAsset.findFirst({
        where: { id: fileAssetId, tenantId },
        select: { id: true },
      });
      if (!fileOk) continue;
      await tx.stageDocument.create({
        data: {
          pathwayStageId,
          fileAssetId,
          sortOrder: docOrder,
        },
      });
      docOrder += 1;
    }
  }

  if (oldPublished) {
    await tx.patientPathway.updateMany({
      where: { pathwayVersionId: oldPublished.id },
      data: { pathwayVersionId: versionId },
    });
  }
}
