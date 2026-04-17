"use client";

import type { KanbanColumn, PipelineStatusFilter } from "@/features/dashboard/app/types";
import { resolveKanbanDropStageId } from "@/features/dashboard/app/utils/kanban-dnd";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { KanbanDragOverlayProvider } from "./pipeline-kanban-dnd-context";
import { PipelineKanbanDragPreview } from "./pipeline-kanban-drag-preview";
import { PipelineKanbanColumn } from "./pipeline-kanban-column";

type PipelineKanbanBoardProps = {
  columns: KanbanColumn[];
  statusFilter: PipelineStatusFilter;
  loadingInitial: boolean;
  loadingMoreStageId: string | null;
  transitioningPatientPathwayId: string | null;
  onLoadMoreColumn: (stageId: string) => void;
  onMovePatientToStage: (patientPathwayId: string, toStageId: string) => void;
  onRequestChangeStage: (patientPathwayId: string) => void;
};

export function PipelineKanbanBoard({
  columns,
  statusFilter,
  loadingInitial,
  loadingMoreStageId,
  transitioningPatientPathwayId,
  onLoadMoreColumn,
  onMovePatientToStage,
  onRequestChangeStage,
}: PipelineKanbanBoardProps) {
  const t = useTranslations("dashboard.pipeline");

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const activePatient = useMemo(() => {
    if (!activeDragId) return null;
    for (const col of columns) {
      const found = col.data.find((p) => p.id === activeDragId);
      if (found) return found;
    }
    return null;
  }, [activeDragId, columns]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;
      const toStageId = resolveKanbanDropStageId(String(over.id), columns);
      if (!toStageId) return;
      const patientPathwayId = String(active.id);
      onMovePatientToStage(patientPathwayId, toStageId);
    },
    [columns, onMovePatientToStage],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  if (loadingInitial) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  const dragDisabled = Boolean(statusFilter);

  return (
    <div className="space-y-2">
      {!dragDisabled ? (
        <p className="bg-muted/40 text-foreground/90 rounded-md border border-muted-foreground/15 px-3 py-2 text-sm font-medium">
          {t("drag.hint")}
        </p>
      ) : null}
      <KanbanDragOverlayProvider>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((col) => (
              <PipelineKanbanColumn
                key={col.stage.id}
                column={col}
                statusFilter={statusFilter}
                dragDisabled={dragDisabled}
                transitioningPatientPathwayId={transitioningPatientPathwayId}
                loadingMore={loadingMoreStageId === col.stage.id}
                onLoadMore={() => onLoadMoreColumn(col.stage.id)}
                onRequestChangeStage={onRequestChangeStage}
              />
            ))}
          </div>
          {!dragDisabled ? (
            <DragOverlay dropAnimation={null}>
              {activePatient ? <PipelineKanbanDragPreview pp={activePatient} /> : null}
            </DragOverlay>
          ) : null}
        </DndContext>
      </KanbanDragOverlayProvider>
    </div>
  );
}
