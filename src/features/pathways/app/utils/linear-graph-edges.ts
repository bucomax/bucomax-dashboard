import type { Edge, Node } from "@xyflow/react";

/** Arestas em cadeia na ordem dos nós (compatível com React Flow ao abrir o editor de grafo). */
export function buildLinearEdges(nodes: Node[]): Edge[] {
  const out: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    out.push({
      id: `e-${a.id}-${b.id}`,
      source: a.id,
      target: b.id,
    });
  }
  return out;
}
