import type { Edge, Node } from "@xyflow/react";

export function parsePathwayGraph(graphJson: unknown): { nodes: Node[]; edges: Edge[] } {
  const graph = graphJson as { nodes?: Node[]; edges?: Edge[] };
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
  };
}

/** Comparável entre canvas local e `graphJson` persistido (ignora campos internos do React Flow). */
export function pathwayDraftSignature(nodes: Node[], edges: Edge[]): string {
  return JSON.stringify({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  });
}

export function isPathwayDraftDirty(params: {
  graphJson: unknown;
  nodes: Node[];
  edges: Edge[];
  pathwayName: string;
  syncedPathwayName: string;
}): boolean {
  if (params.graphJson == null) return false;
  const saved = parsePathwayGraph(params.graphJson);
  return (
    pathwayDraftSignature(saved.nodes, saved.edges) !==
      pathwayDraftSignature(params.nodes, params.edges) ||
    params.pathwayName.trim() !== params.syncedPathwayName.trim()
  );
}

/**
 * `true` quando o rascunho persistido não é o mesmo grafo da versão publicada.
 * Sem versão publicada → há algo a publicar (primeira publicação), desde que exista `savedGraphJson`.
 */
export function savedDraftGraphDiffersFromPublished(
  savedGraphJson: unknown,
  publishedGraphJson: unknown | null,
): boolean {
  if (savedGraphJson == null) return false;
  if (publishedGraphJson == null) return true;
  const saved = parsePathwayGraph(savedGraphJson);
  const pub = parsePathwayGraph(publishedGraphJson);
  return pathwayDraftSignature(saved.nodes, saved.edges) !== pathwayDraftSignature(pub.nodes, pub.edges);
}
