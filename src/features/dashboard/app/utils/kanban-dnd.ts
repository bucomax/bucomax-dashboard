import type { KanbanColumn } from "@/features/dashboard/app/types";

/**
 * Resolve o `stageId` alvo a partir do `over.id` do @dnd-kit (coluna ou card).
 */
export function resolveKanbanDropStageId(overId: string, columns: KanbanColumn[]): string | null {
  if (columns.some((c) => c.stage.id === overId)) {
    return overId;
  }
  for (const col of columns) {
    if (col.data.some((p) => p.id === overId)) {
      return col.stage.id;
    }
  }
  return null;
}
