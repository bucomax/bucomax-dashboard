import { AuditEventType, type Prisma, type PrismaClient } from "@prisma/client";
import { auditEventTypeToCategory } from "@/lib/clients/timeline-event-categories";
import type { ClientTimelineEventCategory, ClientTimelineItemDto } from "@/types/api/clients-v1";

const EXPORT_AUDIT_TAKE = 12000;
const EXPORT_TRANSITION_TAKE = 12000;
const EXPORT_ROW_CAP = 10000;

const stageTransitionTimelineInclude = {
  fromStage: { select: { id: true, name: true, stageKey: true } },
  toStage: { select: { id: true, name: true, stageKey: true } },
  actor: { select: { id: true, name: true, email: true } },
  forcedByUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.StageTransitionInclude;

type StageTransitionTimelineRow = Prisma.StageTransitionGetPayload<{
  include: typeof stageTransitionTimelineInclude;
}>;

function transitionIdFromAuditPayload(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const tid = (payload as { transitionId?: unknown }).transitionId;
  return typeof tid === "string" && tid.length > 0 ? tid : null;
}

function serializeLegacyTransition(row: StageTransitionTimelineRow): Omit<
  Extract<ClientTimelineItemDto, { kind: "legacy_transition" }>,
  "kind" | "category"
> {
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

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function payloadSummary(payload: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(payload);
    return s.length > 600 ? `${s.slice(0, 600)}…` : s;
  } catch {
    return "";
  }
}

export type BuildAuditExportParams = {
  from: Date;
  to: Date;
  categoryFilter: Set<ClientTimelineEventCategory> | null;
};

/**
 * Monta CSV UTF-8 (com BOM) com linha do tempo do paciente para fins de auditoria / perícia.
 */
export async function buildClientAuditExportCsv(
  db: PrismaClient,
  tenantId: string,
  clientId: string,
  params: BuildAuditExportParams,
): Promise<{ csv: string; rowCount: number }> {
  const { from, to, categoryFilter } = params;

  const [audits, pathways] = await Promise.all([
    db.auditEvent.findMany({
      where: {
        tenantId,
        clientId,
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: "desc" },
      take: EXPORT_AUDIT_TAKE,
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
          where: {
            patientPathwayId: { in: pathwayIds },
            createdAt: { gte: from, lte: to },
          },
          orderBy: { createdAt: "desc" },
          take: EXPORT_TRANSITION_TAKE,
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
    const payload =
      a.payload != null && typeof a.payload === "object" && !Array.isArray(a.payload)
        ? { ...(a.payload as Record<string, unknown>) }
        : {};
    const item: ClientTimelineItemDto = {
      kind: "audit",
      id: a.id,
      type: a.type,
      category: auditEventTypeToCategory(a.type),
      createdAt: a.createdAt.toISOString(),
      actor: a.actor
        ? { id: a.actor.id, name: a.actor.name, email: a.actor.email }
        : null,
      patientPathwayId: a.patientPathwayId,
      payload,
    };
    merged.push({ sortAt: a.createdAt, item });
  }

  for (const tr of legacyRows) {
    merged.push({
      sortAt: tr.createdAt,
      item: {
        kind: "legacy_transition",
        category: "clinical",
        ...serializeLegacyTransition(tr),
      },
    });
  }

  merged.sort((x, y) => y.sortAt.getTime() - x.sortAt.getTime());

  let rows = merged;
  if (categoryFilter != null && categoryFilter.size > 0) {
    rows = merged.filter((m) => categoryFilter.has(m.item.category));
  }

  const capped = rows.slice(0, EXPORT_ROW_CAP);

  const header = ["createdAt", "kind", "type", "category", "actorEmail", "summary"];
  const lines = [header.join(",")];

  for (const { item } of capped) {
    const createdAt = item.createdAt;
    if (item.kind === "audit") {
      const actorEmail = item.actor?.email ?? "";
      const summary = payloadSummary(item.payload);
      lines.push(
        [
          csvCell(createdAt),
          csvCell("audit"),
          csvCell(item.type),
          csvCell(item.category),
          csvCell(actorEmail),
          csvCell(summary),
        ].join(","),
      );
    } else {
      const summary = `${item.fromStage?.name ?? "—"} → ${item.toStage.name}`;
      lines.push(
        [
          csvCell(createdAt),
          csvCell("legacy_transition"),
          csvCell("STAGE_TRANSITION_LEGACY"),
          csvCell(item.category),
          csvCell(item.actor.email),
          csvCell(summary),
        ].join(","),
      );
    }
  }

  const csv = "\ufeff" + lines.join("\n");
  return { csv, rowCount: capped.length };
}
