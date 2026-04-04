import type { FitViewOptions } from "@xyflow/react";

/** Origem do primeiro nó e passo entre etapas no editor de grafo (evita sobreposição ao dar zoom inicial). */
const NODE_ORIGIN = { x: 80, y: 56 } as const;
const NODE_STEP = { x: 280, y: 160 } as const;

export function pathwayEditorGraphNodePosition(index: number): { x: number; y: number } {
  return {
    x: NODE_ORIGIN.x + index * NODE_STEP.x,
    y: NODE_ORIGIN.y + index * NODE_STEP.y,
  };
}

/** `fitView` inicial: mais padding e teto de zoom para abrir o canvas menos “grudado” nos nós. */
export const pathwayEditorFitViewOptions: FitViewOptions = {
  padding: 0.18,
  maxZoom: 0.82,
};
