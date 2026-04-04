import type { Node } from "@xyflow/react";

import {
  normalizeStageChecklistDraftItems,
  normalizeStageDocumentDraftItems,
  type PathwayStageDocumentDraft,
  type StageChecklistDraftItem,
} from "@/lib/pathway/graph";
import { pathwayEditorGraphNodePosition } from "@/lib/pathway/graph-editor-layout";

export function parsePathwayStageNodes(graphJson: unknown): Node[] {
  const graph = graphJson as { nodes?: Node[] };
  return Array.isArray(graph.nodes) ? graph.nodes : [];
}

function nodeHasPersistedPosition(node: Node): boolean {
  const p = node.position;
  return (
    p != null &&
    typeof p === "object" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

/**
 * Garante `type` e `position` persistível: **não** sobrescreve coordenadas já salvas
 * (layout do editor de grafo); só preenche quando falta ou é inválido.
 */
export function ensurePathwayGraphNodePositions(nodes: Node[]): Node[] {
  return nodes.map((node, index) => ({
    ...node,
    type: node.type ?? "default",
    position: nodeHasPersistedPosition(node) ? node.position : pathwayEditorGraphNodePosition(index),
  }));
}

export function updatePathwayStageNodeChecklistItems(
  data: Node["data"],
  updater: (items: StageChecklistDraftItem[]) => StageChecklistDraftItem[],
) {
  const nextData = { ...(data as Record<string, unknown> | undefined) };
  const nextItems = updater(normalizeStageChecklistDraftItems(nextData.checklistItems));

  if (nextItems.length === 0) {
    delete nextData.checklistItems;
  } else {
    nextData.checklistItems = nextItems;
  }

  return nextData;
}

export function updatePathwayStageNodeStageDocuments(
  data: Node["data"],
  updater: (items: PathwayStageDocumentDraft[]) => PathwayStageDocumentDraft[],
) {
  const nextData = { ...(data as Record<string, unknown> | undefined) };
  const nextDocs = updater(normalizeStageDocumentDraftItems(nextData.stageDocuments));

  if (nextDocs.length === 0) {
    delete nextData.stageDocuments;
  } else {
    nextData.stageDocuments = nextDocs;
  }

  return nextData;
}
