/** Grafo inicial mínimo compatível com `deriveStagesFromGraph` e React Flow. */
import { pathwayEditorGraphNodePosition } from "@/lib/pathway/graph-editor-layout";

export function createDefaultPathwayGraph(): { nodes: unknown[]; edges: unknown[] } {
  return {
    nodes: [
      {
        id: "stage-1",
        type: "default",
        position: pathwayEditorGraphNodePosition(0),
        data: { label: "Primeira etapa", patientMessage: "" },
      },
    ],
    edges: [],
  };
}
