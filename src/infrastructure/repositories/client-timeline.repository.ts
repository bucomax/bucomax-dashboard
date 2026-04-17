import type { Prisma } from "@prisma/client";

import type { IClientTimelineRepository } from "@/application/ports/client-timeline-repository.port";
import { prisma } from "@/infrastructure/database/prisma";
import {
  CLIENT_TIMELINE_FETCH_CAP,
} from "@/lib/constants/client-timeline";
import type {
  ClientTimelineMergeAuditRow,
  ClientTimelineMergeSources,
  ClientTimelineMergeTransitionRow,
} from "@/types/api/clients-v1";

const stageTransitionTimelineInclude = {
  fromStage: { select: { id: true, name: true, stageKey: true } },
  toStage: { select: { id: true, name: true, stageKey: true } },
  actor: { select: { id: true, name: true, email: true } },
  forcedByUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.StageTransitionInclude;

type StageTransitionTimelineRow = Prisma.StageTransitionGetPayload<{
  include: typeof stageTransitionTimelineInclude;
}>;

function mapTransitionRow(tr: StageTransitionTimelineRow): ClientTimelineMergeTransitionRow {
  return {
    id: tr.id,
    patientPathwayId: tr.patientPathwayId,
    createdAt: tr.createdAt,
    note: tr.note,
    ruleOverrideReason: tr.ruleOverrideReason,
    fromStage: tr.fromStage,
    toStage: tr.toStage,
    actor: tr.actor,
    forcedByUser: tr.forcedByUser,
  };
}

export class ClientTimelinePrismaRepository implements IClientTimelineRepository {
  async fetchMergeSources(tenantId: string, clientId: string): Promise<ClientTimelineMergeSources> {
    const [auditsRaw, pathways] = await Promise.all([
      prisma.auditEvent.findMany({
        where: { tenantId, clientId },
        orderBy: { createdAt: "desc" },
        take: CLIENT_TIMELINE_FETCH_CAP,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.patientPathway.findMany({
        where: { tenantId, clientId },
        select: { id: true },
      }),
    ]);

    const pathwayIds = pathways.map((p) => p.id);
    const transitionsRaw =
      pathwayIds.length === 0
        ? []
        : await prisma.stageTransition.findMany({
            where: { patientPathwayId: { in: pathwayIds } },
            orderBy: { createdAt: "desc" },
            take: CLIENT_TIMELINE_FETCH_CAP,
            include: stageTransitionTimelineInclude,
          });

    const audits: ClientTimelineMergeAuditRow[] = auditsRaw.map((a) => ({
      id: a.id,
      type: a.type as ClientTimelineMergeAuditRow["type"],
      createdAt: a.createdAt,
      payload: a.payload,
      patientPathwayId: a.patientPathwayId,
      actor: a.actor,
    }));

    const transitions: ClientTimelineMergeTransitionRow[] = transitionsRaw.map(mapTransitionRow);

    return { audits, transitions };
  }
}

export const clientTimelinePrismaRepository = new ClientTimelinePrismaRepository();
