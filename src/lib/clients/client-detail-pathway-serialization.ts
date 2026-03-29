import type { Prisma } from "@prisma/client";
import { buildPagination } from "@/lib/api/pagination";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";
import type {
  ClientCompletedTreatmentDto,
  ClientDetailStageDto,
  ClientDetailTransitionDto,
  ClientPatientPathwayDetailDto,
} from "@/types/api/clients-v1";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Include usado na ficha do paciente (jornada ativa e histórico concluído). */
export const clientDetailPatientPathwaySelect = {
  id: true,
  createdAt: true,
  completedAt: true,
  enteredStageAt: true,
  pathway: { select: { id: true, name: true } },
  pathwayVersion: {
    select: {
      id: true,
      version: true,
      stages: {
        orderBy: { sortOrder: "asc" as const },
        select: {
          id: true,
          name: true,
          stageKey: true,
          sortOrder: true,
          alertWarningDays: true,
          alertCriticalDays: true,
          stageDocuments: {
            orderBy: { sortOrder: "asc" as const },
            select: {
              id: true,
              sortOrder: true,
              fileAsset: {
                select: { id: true, fileName: true, mimeType: true },
              },
            },
          },
          checklistItems: {
            orderBy: { sortOrder: "asc" as const },
            select: {
              id: true,
              label: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  },
  currentStage: {
    select: {
      id: true,
      name: true,
      stageKey: true,
      sortOrder: true,
      alertWarningDays: true,
      alertCriticalDays: true,
    },
  },
  checklistItems: {
    select: {
      checklistItemId: true,
      completedAt: true,
    },
  },
} satisfies Prisma.PatientPathwaySelect;

export type ClientDetailPatientPathwayRow = Prisma.PatientPathwayGetPayload<{
  select: typeof clientDetailPatientPathwaySelect;
}>;

export function buildStagesPayload(pp: ClientDetailPatientPathwayRow): ClientDetailStageDto[] {
  const checklistProgressByItemId = new Map(
    pp.checklistItems.map((item) => [item.checklistItemId, item.completedAt]),
  );

  return pp.pathwayVersion.stages.map((s) => ({
    id: s.id,
    name: s.name,
    stageKey: s.stageKey,
    sortOrder: s.sortOrder,
    alertWarningDays: s.alertWarningDays,
    alertCriticalDays: s.alertCriticalDays,
    documents: s.stageDocuments.map((sd) => ({
      id: sd.id,
      sortOrder: sd.sortOrder,
      file: {
        id: sd.fileAsset.id,
        fileName: sd.fileAsset.fileName,
        mimeType: sd.fileAsset.mimeType,
      },
    })),
    checklistItems: s.checklistItems.map((item) => {
      const completedAt = checklistProgressByItemId.get(item.id) ?? null;
      return {
        id: item.id,
        label: item.label,
        sortOrder: item.sortOrder,
        completed: completedAt != null,
        completedAt: completedAt?.toISOString() ?? null,
      };
    }),
  }));
}

export type ClientDetailStageTransitionRow = {
  id: string;
  note: string | null;
  createdAt: Date;
  fromStage: { id: string; name: string; stageKey: string } | null;
  toStage: { id: string; name: string; stageKey: string };
  actor: { id: string; name: string | null; email: string };
};

export function mapTransitionRow(tr: ClientDetailStageTransitionRow): ClientDetailTransitionDto {
  return {
    id: tr.id,
    fromStage: tr.fromStage,
    toStage: tr.toStage,
    note: tr.note,
    actor: {
      id: tr.actor.id,
      name: tr.actor.name,
      email: tr.actor.email,
    },
    createdAt: tr.createdAt.toISOString(),
  };
}

export function serializeActivePatientPathwayDetail(
  pp: ClientDetailPatientPathwayRow,
  args: {
    now: Date;
    transitionRows: ClientDetailStageTransitionRow[];
    totalTransitions: number;
    page: number;
    limit: number;
  },
): ClientPatientPathwayDetailDto {
  const stagesPayload = buildStagesPayload(pp);
  const cs = pp.currentStage;
  const journeyCompleted = pp.completedAt != null;
  const daysInStage = journeyCompleted
    ? 0
    : Math.floor((args.now.getTime() - pp.enteredStageAt.getTime()) / MS_PER_DAY);
  const slaStatus = journeyCompleted
    ? ("ok" as const)
    : computeSlaHealthStatus(
        pp.enteredStageAt,
        args.now,
        cs?.alertWarningDays,
        cs?.alertCriticalDays,
      );

  return {
    id: pp.id,
    completedAt: pp.completedAt?.toISOString() ?? null,
    pathway: pp.pathway,
    pathwayVersion: {
      id: pp.pathwayVersion.id,
      version: pp.pathwayVersion.version,
      stages: stagesPayload,
    },
    currentStage: cs
      ? {
          id: cs.id,
          name: cs.name,
          stageKey: cs.stageKey,
          sortOrder: cs.sortOrder,
          alertWarningDays: cs.alertWarningDays,
          alertCriticalDays: cs.alertCriticalDays,
          documents: stagesPayload.find((st) => st.id === cs.id)?.documents ?? [],
          checklistItems: stagesPayload.find((st) => st.id === cs.id)?.checklistItems ?? [],
        }
      : null,
    enteredStageAt: pp.enteredStageAt.toISOString(),
    daysInStage,
    slaStatus,
    transitions: {
      data: args.transitionRows.map(mapTransitionRow),
      pagination: buildPagination(args.page, args.limit, args.totalTransitions),
    },
  };
}

const MAX_COMPLETED_TRANSITIONS = 400;

export function serializeCompletedTreatment(
  pp: ClientDetailPatientPathwayRow,
  transitionRows: ClientDetailStageTransitionRow[],
  opts?: { transitionsTruncated?: boolean },
): ClientCompletedTreatmentDto {
  const stagesPayload = buildStagesPayload(pp);
  const cs = pp.currentStage;
  const completedAt = pp.completedAt!;
  return {
    id: pp.id,
    startedAt: pp.createdAt.toISOString(),
    completedAt: completedAt.toISOString(),
    pathway: pp.pathway,
    pathwayVersion: {
      id: pp.pathwayVersion.id,
      version: pp.pathwayVersion.version,
      stages: stagesPayload,
    },
    currentStage: cs
      ? {
          id: cs.id,
          name: cs.name,
          stageKey: cs.stageKey,
          sortOrder: cs.sortOrder,
          alertWarningDays: cs.alertWarningDays,
          alertCriticalDays: cs.alertCriticalDays,
          documents: stagesPayload.find((st) => st.id === cs.id)?.documents ?? [],
          checklistItems: stagesPayload.find((st) => st.id === cs.id)?.checklistItems ?? [],
        }
      : null,
    transitions: transitionRows.map(mapTransitionRow),
    transitionsTruncated: opts?.transitionsTruncated ?? false,
  };
}

export { MAX_COMPLETED_TRANSITIONS };
