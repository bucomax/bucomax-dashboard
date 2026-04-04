import type { SeedStageDocumentBundleItem, StageSeed } from "./types";

/** Manter alinhado a `src/lib/pathway/graph-editor-layout.ts` (pathwayEditorGraphNodePosition). */
const SEED_GRAPH_NODE_ORIGIN = { x: 80, y: 56 };
const SEED_GRAPH_NODE_STEP = { x: 280, y: 160 };

export const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number, hour = 10) {
  const date = new Date(Date.now() - days * DAY_MS);
  date.setHours(hour, 0, 0, 0);
  return date;
}

export function safeKeyPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildGraphJson(stages: StageSeed[]) {
  const nodes = stages.map((stage, index) => ({
    id: stage.key,
    type: "default",
    position: {
      x: SEED_GRAPH_NODE_ORIGIN.x + index * SEED_GRAPH_NODE_STEP.x,
      y: SEED_GRAPH_NODE_ORIGIN.y + index * SEED_GRAPH_NODE_STEP.y,
    },
    data: {
      label: stage.name,
      patientMessage: stage.patientMessage,
      alertWarningDays: stage.alertWarningDays,
      alertCriticalDays: stage.alertCriticalDays,
      checklistItems: stage.checklist.map((label, itemIndex) => ({
        id: `${stage.key}-item-${itemIndex + 1}`,
        label,
      })),
    },
  }));

  const edges = stages.slice(0, -1).map((stage, index) => ({
    id: `e-${stage.key}-${stages[index + 1]!.key}`,
    source: stage.key,
    target: stages[index + 1]!.key,
  }));

  return { nodes, edges };
}

export function buildDispatchStub(input: {
  tenantId: string;
  clientId: string;
  stageId: string;
  stageName: string;
  correlationId: string;
  documents: SeedStageDocumentBundleItem[];
}) {
  return {
    event: "patient.stage_changed",
    correlationId: input.correlationId,
    channel: "whatsapp_stub",
    dispatchStatus: "pending_stub",
    tenantId: input.tenantId,
    clientId: input.clientId,
    stageId: input.stageId,
    stageName: input.stageName,
    documents: input.documents,
  };
}

export function buildDaysAgoTimeline(oldestDaysAgo: number, newestDaysAgo: number, count: number) {
  if (count <= 1) return [newestDaysAgo];

  const span = oldestDaysAgo - newestDaysAgo;
  return Array.from({ length: count }, (_, index) =>
    Math.max(
      newestDaysAgo,
      Math.round(oldestDaysAgo - (span * index) / (count - 1)),
    ),
  );
}
