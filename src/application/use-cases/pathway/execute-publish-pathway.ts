import type { Prisma } from "@prisma/client";

import { revalidateTenantPathwaysAndClientsLists } from "@/infrastructure/cache/revalidate-tenant-lists";
import { runPublishPathwayVersionTransaction } from "@/infrastructure/pathway/publish-pathway-version-transaction";
import {
  firstPreflightHttpError,
  runPathwayPublishPreflight,
} from "@/infrastructure/pathway/publish-pathway-preflight";
import { pathwayPrismaRepository } from "@/infrastructure/repositories/pathway.repository";
import { deriveStagesFromGraph } from "@/domain/pathway/graph-normalizer";

export type PublishPathwayVersionFlowErrorCode = "PATHWAY_NOT_FOUND" | "VERSION_NOT_FOUND";

export type PublishPathwayVersionSuccess = {
  version: {
    id: string;
    pathwayId: string;
    version: number;
    published: boolean;
    stages: {
      id: string;
      stageKey: string;
      name: string;
      sortOrder: number;
      patientMessage: string | null;
      alertWarningDays: number | null;
      alertCriticalDays: number | null;
      defaultAssigneeUserId: string | null;
      defaultAssigneeUserIds: string[];
    }[];
  };
};

/**
 * Publica uma versão de pathway: preflight, transação de persistência, revalidate caches.
 */
export async function runPublishPathwayVersionFlow(params: {
  tenantId: string;
  pathwayId: string;
  versionId: string;
  apiT: (key: string, params?: Record<string, string>) => string;
}): Promise<
  | { ok: true; data: PublishPathwayVersionSuccess }
  | { ok: false; code: PublishPathwayVersionFlowErrorCode }
  | { ok: false; preflightHttp: NonNullable<ReturnType<typeof firstPreflightHttpError>> }
> {
  const { tenantId, pathwayId, versionId, apiT } = params;

  const pathway = await pathwayPrismaRepository.findCarePathwayIdForPublish(tenantId, pathwayId);
  if (!pathway) {
    return { ok: false, code: "PATHWAY_NOT_FOUND" };
  }

  const version = await pathwayPrismaRepository.findPathwayVersionForPublish(pathwayId, versionId);
  if (!version) {
    return { ok: false, code: "VERSION_NOT_FOUND" };
  }

  const versionRow = version as { graphJson: unknown };
  const preflight = await runPathwayPublishPreflight({
    tenantId,
    pathwayId,
    versionId,
    graphJson: versionRow.graphJson,
    apiT,
  });
  const httpErr = firstPreflightHttpError(preflight.issues);
  if (httpErr) {
    return { ok: false, preflightHttp: httpErr };
  }

  const stages = deriveStagesFromGraph(versionRow.graphJson);

  const oldPublished = await pathwayPrismaRepository.findOldPublishedVersionForPublish(
    pathwayId,
    versionId,
  );

  const oldStagesByKey = new Map(
    (oldPublished as { stages?: Array<{ id: string; stageKey: string }> } | null)?.stages?.map((s) => [
      s.stageKey,
      s,
    ]) ?? [],
  );

  await pathwayPrismaRepository.runPublishTransaction(async (tx) => {
    await runPublishPathwayVersionTransaction(tx as Prisma.TransactionClient, {
      tenantId,
      pathwayId,
      versionId,
      stages,
      oldStagesByKey,
      oldPublished,
    });
  });

  const published = await pathwayPrismaRepository.findPathwayVersionWithStagesForPublish(versionId);

  revalidateTenantPathwaysAndClientsLists(tenantId);

  if (!published) {
    return { ok: false, code: "VERSION_NOT_FOUND" };
  }

  const pv = published as {
    id: string;
    pathwayId: string;
    version: number;
    published: boolean;
    stages: Array<{
      id: string;
      stageKey: string;
      name: string;
      sortOrder: number;
      patientMessage: string | null;
      alertWarningDays: number | null;
      alertCriticalDays: number | null;
      defaultAssigneeUserId: string | null;
      defaultAssigneeUserIds: string[];
    }>;
  };

  return {
    ok: true,
    data: {
      version: {
        id: pv.id,
        pathwayId: pv.pathwayId,
        version: pv.version,
        published: pv.published,
        stages: pv.stages.map((s) => ({
          id: s.id,
          stageKey: s.stageKey,
          name: s.name,
          sortOrder: s.sortOrder,
          patientMessage: s.patientMessage,
          alertWarningDays: s.alertWarningDays,
          alertCriticalDays: s.alertCriticalDays,
          defaultAssigneeUserId: s.defaultAssigneeUserId,
          defaultAssigneeUserIds: s.defaultAssigneeUserIds,
        })),
      },
    },
  };
}
