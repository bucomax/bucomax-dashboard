/** Grafo inicial mínimo compatível com `deriveStagesFromGraph` e React Flow. */
export function createDefaultPathwayGraph(): { nodes: unknown[]; edges: unknown[] } {
  return {
    nodes: [
      {
        id: "stage-1",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "Primeira etapa", patientMessage: "" },
      },
    ],
    edges: [],
  };
}
