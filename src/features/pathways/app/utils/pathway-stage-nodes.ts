import type { Node } from "@xyflow/react";

import {
  normalizeStageChecklistDraftItems,
  type StageChecklistDraftItem,
} from "@/lib/pathway/graph";

export function parsePathwayStageNodes(graphJson: unknown): Node[] {
  const graph = graphJson as { nodes?: Node[] };
  return Array.isArray(graph.nodes) ? graph.nodes : [];
}

export function normalizePathwayStageNodesPositions(nodes: Node[]): Node[] {
  return nodes.map((node, index) => ({
    ...node,
    type: node.type ?? "default",
    position: { x: 40 + index * 24, y: 40 + index * 24 },
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
