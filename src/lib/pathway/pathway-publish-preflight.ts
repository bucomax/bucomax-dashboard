import type { PrismaClient } from "@prisma/client";

import { deriveStagesFromGraph } from "@/lib/pathway/graph";
import { assertStageDefaultAssigneesInTenant } from "@/lib/pathway/validate-stage-assignees";

export type PathwayPublishPreflightIssue = {
  code: "GRAPH_EMPTY" | "INVALID_ASSIGNEES" | "REMOVED_STAGES_WITH_PATIENTS";
  message: string;
  stages?: { stageKey: string; name: string; patientCount: number }[];
};

export type PublishedStagePatientCountRow = {
  stageKey: string;
  name: string;
  patientCount: number;
};

export type PathwayPublishPreflightResult = {
  canPublish: boolean;
  issues: PathwayPublishPreflightIssue[];
  publishedStagePatientCounts: PublishedStagePatientCountRow[];
  proposedStageKeys: string[];
  removedStageKeys: string[];
  removedStagesWithPatients: PublishedStagePatientCountRow[];
  removedStagesWithoutPatients: { stageKey: string; name: string }[];
};

type ApiT = (key: string, params?: Record<string, string>) => string;

/**
 * Validação compartilhada entre `POST …/publish` e `POST …/publish-preview`.
 * Não grava no banco.
 */
export async function runPathwayPublishPreflight(
  prisma: PrismaClient,
  params: {
    tenantId: string;
    pathwayId: string;
    versionId: string;
    graphJson: unknown;
    apiT: ApiT;
  },
): Promise<PathwayPublishPreflightResult> {
  const { tenantId, pathwayId, versionId, graphJson, apiT } = params;
  const stages = deriveStagesFromGraph(graphJson);
  const issues: PathwayPublishPreflightIssue[] = [];

  const newStageKeys = new Set(stages.map((s) => s.stageKey));
  const proposedStageKeys = [...newStageKeys];

  const oldPublished = await prisma.pathwayVersion.findFirst({
    where: { pathwayId, published: true, NOT: { id: versionId } },
    include: {
      stages: {
        include: {
          _count: { select: { currentPatients: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const publishedStagePatientCounts: PublishedStagePatientCountRow[] =
    oldPublished?.stages.map((s) => ({
      stageKey: s.stageKey,
      name: s.name,
      patientCount: s._count.currentPatients,
    })) ?? [];

  const oldKeys = new Set(oldPublished?.stages.map((s) => s.stageKey) ?? []);
  const removedStageKeys = [...oldKeys].filter((k) => !newStageKeys.has(k));

  const removedStagesWithPatients: PublishedStagePatientCountRow[] =
    oldPublished?.stages
      .filter((s) => !newStageKeys.has(s.stageKey) && s._count.currentPatients > 0)
      .map((s) => ({
        stageKey: s.stageKey,
        name: s.name,
        patientCount: s._count.currentPatients,
      })) ?? [];

  const removedStagesWithoutPatients =
    oldPublished?.stages
      .filter((s) => !newStageKeys.has(s.stageKey) && s._count.currentPatients === 0)
      .map((s) => ({ stageKey: s.stageKey, name: s.name })) ?? [];

  if (stages.length === 0) {
    issues.push({
      code: "GRAPH_EMPTY",
      message: apiT("errors.graphNeedsAtLeastOneNode"),
    });
  }

  const assigneeCheck = await assertStageDefaultAssigneesInTenant(
    prisma,
    tenantId,
    stages.flatMap((s) => s.defaultAssigneeUserIds),
  );
  if (!assigneeCheck.ok) {
    issues.push({
      code: "INVALID_ASSIGNEES",
      message: apiT("errors.invalidAssigneeForTenant"),
    });
  }

  if (removedStagesWithPatients.length > 0) {
    const names = removedStagesWithPatients.map((s) => s.name).join(", ");
    issues.push({
      code: "REMOVED_STAGES_WITH_PATIENTS",
      message: apiT("errors.stagesHavePatients", { stages: names }),
      stages: removedStagesWithPatients,
    });
  }

  return {
    canPublish: issues.length === 0,
    issues,
    publishedStagePatientCounts,
    proposedStageKeys,
    removedStageKeys,
    removedStagesWithPatients,
    removedStagesWithoutPatients,
  };
}

export function firstPreflightHttpError(issues: PathwayPublishPreflightIssue[]): {
  status: number;
  errorCode: string;
  message: string;
  details?: { stages: PathwayPublishPreflightIssue["stages"] };
} | null {
  const first = issues[0];
  if (!first) return null;
  if (first.code === "REMOVED_STAGES_WITH_PATIENTS") {
    return {
      status: 409,
      errorCode: "CONFLICT",
      message: first.message,
      ...(first.stages ? { details: { stages: first.stages } } : {}),
    };
  }
  return {
    status: 422,
    errorCode: "VALIDATION_ERROR",
    message: first.message,
  };
}
