type StageNodeData = {
  label?: string;
  patientMessage?: string;
  alertWarningDays?: unknown;
  alertCriticalDays?: unknown;
  /** Membros do tenant responsáveis por padrão nesta etapa (cuid), em ordem. */
  defaultAssigneeUserIds?: unknown;
  /** Legado: um único cuid; mantido em sync com o primeiro id da lista ao editar. */
  defaultAssigneeUserId?: unknown;
  checklistItems?: unknown;
  /** Arquivos da biblioteca do tenant enviados ao paciente (ex.: WhatsApp) ao entrar na etapa — sincronizado em `StageDocument` ao publicar. */
  stageDocuments?: unknown;
};

export type StageChecklistDraftItem = {
  id: string;
  label: string;
  /** Obrigatório concluir antes de mudar de etapa (salvo override na API). */
  requiredForTransition?: boolean;
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
      const row = item as { id?: unknown; label?: unknown; requiredForTransition?: unknown };
      const label = typeof row.label === "string" ? row.label : "";
      const id =
        typeof row.id === "string" && row.id.trim().length > 0 ? row.id.trim() : `item-${index}`;
      const requiredForTransition = row.requiredForTransition === true;
      return { id, label, ...(requiredForTransition ? { requiredForTransition: true } : {}) };
    })
    .filter((item): item is StageChecklistDraftItem => item !== null);
}

export type PathwayStageDocumentDraft = {
  fileAssetId: string;
  fileName: string;
  mimeType: string;
};

function isLikelyCuid(value: string): boolean {
  return /^c[a-z0-9]{20,32}$/i.test(value);
}

function optionalAssigneeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || !isLikelyCuid(t)) return null;
  return t;
}

/**
 * Lista ordenada e sem duplicatas de cuids válidos a partir do `data` do nó (grafo / rascunho).
 */
export function normalizeStageDefaultAssigneeUserIds(data: StageNodeData | undefined): string[] {
  if (!data) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const rawList = data.defaultAssigneeUserIds;
  if (Array.isArray(rawList)) {
    for (const x of rawList) {
      const id = optionalAssigneeUserId(x);
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  if (out.length > 0) return out;
  const single = optionalAssigneeUserId(data.defaultAssigneeUserId);
  return single ? [single] : [];
}

/**
 * Normaliza a lista de documentos no nó do grafo (rascunho).
 */
export function normalizeStageDocumentDraftItems(value: unknown): PathwayStageDocumentDraft[] {
  if (!Array.isArray(value)) return [];
  const out: PathwayStageDocumentDraft[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as { fileAssetId?: unknown; fileName?: unknown; mimeType?: unknown };
    const fileAssetId = typeof row.fileAssetId === "string" ? row.fileAssetId.trim() : "";
    if (!fileAssetId || !isLikelyCuid(fileAssetId) || seen.has(fileAssetId)) continue;
    seen.add(fileAssetId);
    const fileName =
      typeof row.fileName === "string" && row.fileName.trim().length > 0 ? row.fileName.trim() : "arquivo";
    const mimeType =
      typeof row.mimeType === "string" && row.mimeType.trim().length > 0
        ? row.mimeType.trim()
        : "application/octet-stream";
    out.push({ fileAssetId, fileName, mimeType });
  }
  return out;
}

/**
 * Extrai etapas a partir do JSON do React Flow (`nodes` / `edges`).
 * Esperado: `{ nodes: [{ id, data?: { label?, patientMessage?, …, stageDocuments? } }] }`.
 */
export function deriveStagesFromGraph(graphJson: unknown): {
  stageKey: string;
  name: string;
  sortOrder: number;
  patientMessage: string | null;
  alertWarningDays: number | null;
  alertCriticalDays: number | null;
  defaultAssigneeUserIds: string[];
  defaultAssigneeUserId: string | null;
  checklistItems: {
    label: string;
    sortOrder: number;
    requiredForTransition: boolean;
  }[];
  documentFileAssetIds: string[];
}[] {
  const g = graphJson as {
    nodes?: { id?: string; data?: StageNodeData }[];
  };
  const nodes = g?.nodes ?? [];
  return nodes.map((n, i) => {
    const data = n.data;
    const assigneeIds = normalizeStageDefaultAssigneeUserIds(data);
    return {
      stageKey: String(n.id ?? `stage-${i}`),
      name: String(data?.label ?? n.id ?? `Etapa ${i + 1}`),
      sortOrder: i,
      patientMessage: data?.patientMessage != null ? String(data.patientMessage) : null,
      alertWarningDays: optionalPositiveInt(data?.alertWarningDays),
      alertCriticalDays: optionalPositiveInt(data?.alertCriticalDays),
      defaultAssigneeUserIds: assigneeIds,
      defaultAssigneeUserId: assigneeIds[0] ?? null,
      checklistItems: normalizeStageChecklistDraftItems(data?.checklistItems)
        .filter((item) => item.label.trim().length > 0)
        .map((item, itemIndex) => ({
          label: item.label.trim(),
          sortOrder: itemIndex,
          requiredForTransition: item.requiredForTransition === true,
        })),
      documentFileAssetIds: normalizeStageDocumentDraftItems(data?.stageDocuments).map((d) => d.fileAssetId),
    };
  });
}
