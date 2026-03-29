type StageNodeData = {
  label?: string;
  patientMessage?: string;
  alertWarningDays?: unknown;
  alertCriticalDays?: unknown;
  checklistItems?: unknown;
};

export type StageChecklistDraftItem = {
  id: string;
  label: string;
};

function optionalPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

/**
 * Normaliza itens de checklist no grafo (rascunho).
 * Mantém linhas com `label` vazio para o editor permitir adicionar e preencher depois.
 * Ao publicar, use filtro por `label.trim()` (ex.: {@link deriveStagesFromGraph}).
 */
export function normalizeStageChecklistDraftItems(value: unknown): StageChecklistDraftItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const label = item.trim();
        return label ? { id: `item-${index}`, label } : null;
      }
      if (!item || typeof item !== "object") return null;
      const row = item as { id?: unknown; label?: unknown };
      const label = typeof row.label === "string" ? row.label : "";
      const id =
        typeof row.id === "string" && row.id.trim().length > 0 ? row.id.trim() : `item-${index}`;
      return { id, label };
    })
    .filter((item): item is StageChecklistDraftItem => item !== null);
}

/**
 * Extrai etapas a partir do JSON do React Flow (`nodes` / `edges`).
 * Esperado: `{ nodes: [{ id, data?: { label?, patientMessage?, alertWarningDays?, alertCriticalDays? } }] }`.
 */
export function deriveStagesFromGraph(graphJson: unknown): {
  stageKey: string;
  name: string;
  sortOrder: number;
  patientMessage: string | null;
  alertWarningDays: number | null;
  alertCriticalDays: number | null;
  checklistItems: {
    label: string;
    sortOrder: number;
  }[];
}[] {
  const g = graphJson as {
    nodes?: { id?: string; data?: StageNodeData }[];
  };
  const nodes = g?.nodes ?? [];
  return nodes.map((n, i) => {
    const data = n.data;
    return {
      stageKey: String(n.id ?? `stage-${i}`),
      name: String(data?.label ?? n.id ?? `Etapa ${i + 1}`),
      sortOrder: i,
      patientMessage: data?.patientMessage != null ? String(data.patientMessage) : null,
      alertWarningDays: optionalPositiveInt(data?.alertWarningDays),
      alertCriticalDays: optionalPositiveInt(data?.alertCriticalDays),
      checklistItems: normalizeStageChecklistDraftItems(data?.checklistItems)
        .filter((item) => item.label.trim().length > 0)
        .map((item, itemIndex) => ({
          label: item.label.trim(),
          sortOrder: itemIndex,
        })),
    };
  });
}
