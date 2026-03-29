import type { Edge, Node } from "@xyflow/react";

export function parsePathwayGraph(graphJson: unknown): { nodes: Node[]; edges: Edge[] } {
  const graph = graphJson as { nodes?: Node[]; edges?: Edge[] };
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
  };
}
