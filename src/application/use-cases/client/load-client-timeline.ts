import { buildPagination } from "@/lib/api/pagination";
import {
  CLIENT_TIMELINE_FETCH_CAP,
  CLIENT_TIMELINE_MERGE_CAP,
} from "@/lib/constants/client-timeline";
import { auditEventTypeToCategory } from "@/domain/audit/event-category-mapper";
import type {
  ClientTimelineEventCategory,
  ClientTimelineItemDto,
  ClientTimelineLegacyTransitionDto,
  ClientTimelineMergeSources,
  ClientTimelineMergeTransitionRow,
  ClientTimelineResponseData,
} from "@/types/api/clients-v1";

function serializeLegacyTransition(
  row: ClientTimelineMergeTransitionRow,
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

export type BuildClientTimelineOptions = {
  /** Se definido e não vazio, só mantém itens dessas categorias. */
  categoryFilter?: Set<ClientTimelineEventCategory> | null;
};

/**
 * Merge e paginação a partir de linhas já carregadas (`IClientTimelineRepository.fetchMergeSources`).
 */
export function mergeClientTimelinePage(
  sources: ClientTimelineMergeSources,
  page: number,
  limit: number,
  options?: BuildClientTimelineOptions,
): ClientTimelineResponseData {
  const { audits, transitions } = sources;

  const auditedTransitionIds = new Set<string>();
  for (const a of audits) {
    if (a.type !== "STAGE_TRANSITION") continue;
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
      category: auditEventTypeToCategory(a.type),
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
      item: {
        kind: "legacy_transition",
        category: "clinical",
        ...serializeLegacyTransition(tr),
      },
    });
  }

  merged.sort((x, y) => y.sortAt.getTime() - x.sortAt.getTime());

  const categoryFilter = options?.categoryFilter;
  const mergedFiltered =
    categoryFilter != null && categoryFilter.size > 0
      ? merged.filter((m) => categoryFilter.has(m.item.category))
      : merged;

  const window = mergedFiltered.slice(0, CLIENT_TIMELINE_MERGE_CAP).map((m) => m.item);

  const timelineCapped =
    audits.length >= CLIENT_TIMELINE_FETCH_CAP ||
    transitions.length >= CLIENT_TIMELINE_FETCH_CAP ||
    merged.length > CLIENT_TIMELINE_MERGE_CAP;

  const offset = (page - 1) * limit;
  const pageItems = window.slice(offset, offset + limit);
  const pagination = buildPagination(page, limit, window.length);

  return {
    items: pageItems,
    pagination,
    timelineCapped,
  };
}
