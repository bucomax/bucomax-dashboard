/**
 * Extrai etapas a partir do JSON do React Flow (`nodes` / `edges`).
 * Esperado: `{ nodes: [{ id, data?: { label?, patientMessage? } }] }`.
 */
export function deriveStagesFromGraph(graphJson: unknown): {
  stageKey: string;
  name: string;
  sortOrder: number;
  patientMessage: string | null;
}[] {
  const g = graphJson as {
    nodes?: { id?: string; data?: { label?: string; patientMessage?: string } }[];
  };
  const nodes = g?.nodes ?? [];
  return nodes.map((n, i) => ({
    stageKey: String(n.id ?? `stage-${i}`),
    name: String(n.data?.label ?? n.id ?? `Etapa ${i + 1}`),
    sortOrder: i,
    patientMessage: n.data?.patientMessage != null ? String(n.data.patientMessage) : null,
  }));
}
