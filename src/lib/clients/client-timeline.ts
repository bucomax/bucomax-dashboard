import { AuditEventType, type Prisma, type PrismaClient } from "@prisma/client";
import { buildPagination } from "@/lib/api/pagination";
import type {
  ClientTimelineItemDto,
  ClientTimelineLegacyTransitionDto,
  ClientTimelineResponseData,
} from "@/types/api/clients-v1";

const FETCH_CAP = 320;
const MERGE_CAP = 400;

const stageTransitionTimelineInclude = {
  fromStage: { select: { id: true, name: true, stageKey: true } },
  toStage: { select: { id: true, name: true, stageKey: true } },
  actor: { select: { id: true, name: true, email: true } },
  forcedByUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.StageTransitionInclude;

type StageTransitionTimelineRow = Prisma.StageTransitionGetPayload<{
  include: typeof stageTransitionTimelineInclude;
}>;

function serializeLegacyTransition(
  row: StageTransitionTimelineRow,
): ClientTimelineLegacyTransitionDto {
  return {
    id: row.id,
    patientPathwayId: row.patientPathwayId,
    fromStage: row.fromStage
      ? {
          id: row.fromStage.id,
          name: row.fromStage.name,
          stageKey: row.fromStage.stageKey,
        }
      : null,
    toStage: {
      id: row.toStage.id,
      name: row.toStage.name,
      stageKey: row.toStage.stageKey,
    },
    note: row.note,
    ruleOverrideReason: row.ruleOverrideReason,
    forcedBy: row.forcedByUser
      ? {
          id: row.forcedByUser.id,
          name: row.forcedByUser.name,
          email: row.forcedByUser.email,
        }
      : null,
    actor: {
      id: row.actor.id,
      name: row.actor.name,
      email: row.actor.email,
    },
    createdAt: row.createdAt.toISOString(),
  };
}

function transitionIdFromAuditPayload(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const tid = (payload as { transitionId?: unknown }).transitionId;
  return typeof tid === "string" && tid.length > 0 ? tid : null;
}

export async function buildClientTimelinePage(
  db: PrismaClient,
  tenantId: string,
  clientId: string,
  page: number,
  limit: number,
): Promise<ClientTimelineResponseData> {
  const [audits, pathways] = await Promise.all([
    db.auditEvent.findMany({
      where: { tenantId, clientId },
      orderBy: { createdAt: "desc" },
      take: FETCH_CAP,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
    db.patientPathway.findMany({
      where: { tenantId, clientId },
      select: { id: true },
    }),
  ]);

  const pathwayIds = pathways.map((p) => p.id);
  const transitions =
    pathwayIds.length === 0
      ? []
      : await db.stageTransition.findMany({
          where: { patientPathwayId: { in: pathwayIds } },
          orderBy: { createdAt: "desc" },
          take: FETCH_CAP,
          include: stageTransitionTimelineInclude,
        });

  const auditedTransitionIds = new Set<string>();
  for (const a of audits) {
    if (a.type !== AuditEventType.STAGE_TRANSITION) continue;
    const tid = transitionIdFromAuditPayload(a.payload);
    if (tid) auditedTransitionIds.add(tid);
  }

  const legacyRows = transitions.filter((t) => !auditedTransitionIds.has(t.id));

  const merged: { sortAt: Date; item: ClientTimelineItemDto }[] = [];

  for (const a of audits) {
    const item: ClientTimelineItemDto = {
      kind: "audit",
      id: a.id,
      type: a.type,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor
        ? { id: a.actor.id, name: a.actor.name, email: a.actor.email }
        : null,
      patientPathwayId: a.patientPathwayId,
      payload:
        a.payload != null && typeof a.payload === "object" && !Array.isArray(a.payload)
          ? { ...(a.payload as Record<string, unknown>) }
          : {},
    };
    merged.push({ sortAt: a.createdAt, item });
  }

  for (const tr of legacyRows) {
    merged.push({
      sortAt: tr.createdAt,
      item: { kind: "legacy_transition", ...serializeLegacyTransition(tr) },
    });
  }

  merged.sort((x, y) => y.sortAt.getTime() - x.sortAt.getTime());

  const window = merged.slice(0, MERGE_CAP).map((m) => m.item);

  const timelineCapped = audits.length >= FETCH_CAP || transitions.length >= FETCH_CAP || merged.length > MERGE_CAP;

  const offset = (page - 1) * limit;
  const pageItems = window.slice(offset, offset + limit);
  const pagination = buildPagination(page, limit, window.length);

  return {
    items: pageItems,
    pagination,
    timelineCapped,
  };
}
