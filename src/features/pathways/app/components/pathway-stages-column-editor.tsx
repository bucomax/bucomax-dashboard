"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Node } from "@xyflow/react";
import { ExternalLink, Loader2, Plus, RefreshCw, Rocket, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { PathwaySortableStageRow } from "@/features/pathways/app/components/pathway-sortable-stage-row";
import { usePathwayDraftVersion } from "@/features/pathways/app/hooks/use-pathway-draft-version";
import { buildLinearEdges } from "@/features/pathways/app/utils/linear-graph-edges";
import {
  normalizePathwayStageNodesPositions,
  parsePathwayStageNodes,
  updatePathwayStageNodeChecklistItems,
} from "@/features/pathways/app/utils/pathway-stage-nodes";
import type { PathwayStagesColumnEditorProps, StageSlaField } from "@/features/pathways/types/column-editor";
import { Link } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardFooter } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function PathwayStagesColumnEditor({ pathwayId }: PathwayStagesColumnEditorProps) {
  const t = useTranslations("pathways.columnEditor");
  const tEditor = useTranslations("pathways.editor");
  const {
    loading,
    error,
    versionId,
    graphJson,
    saving,
    publishing,
    saveDraft,
    publishDraft,
    reload,
  } = usePathwayDraftVersion(pathwayId);
  const [nodes, setNodes] = useState<Node[]>([]);

  const edges = useMemo(() => buildLinearEdges(nodes), [nodes]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (graphJson == null) return;
    setNodes(normalizePathwayStageNodesPositions(parsePathwayStageNodes(graphJson)));
  }, [graphJson]);

  function graphPayload() {
    return { nodes, edges };
  }

  async function handleSave() {
    if (!versionId) return;
    try {
      await saveDraft(graphPayload());
      toast.success(tEditor("saveSuccess"));
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  async function handlePublish() {
    if (!versionId) return;
    try {
      await publishDraft(graphPayload());
      toast.success(tEditor("publishSuccess"));
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setNodes((prev) => {
      const oldIndex = prev.findIndex((n) => n.id === active.id);
      const newIndex = prev.findIndex((n) => n.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return normalizePathwayStageNodesPositions(arrayMove(prev, oldIndex, newIndex));
    });
  }

  function addStage() {
    const id = `stage-${crypto.randomUUID()}`;
    setNodes((nds) =>
      normalizePathwayStageNodesPositions([
        ...nds,
        {
          id,
          type: "default",
          position: { x: 0, y: 0 },
          data: { label: `${tEditor("defaultStageLabel")} ${nds.length + 1}`, patientMessage: "" },
        },
      ]),
    );
  }

  function updateLabel(id: string, label: string) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n,
      ),
    );
  }

  function updateSla(id: string, field: StageSlaField, value: number | undefined) {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const nextData = { ...n.data } as Record<string, unknown>;
        if (value === undefined) {
          delete nextData[field];
        } else {
          nextData[field] = value;
        }
        return { ...n, data: nextData };
      }),
    );
  }

  function addChecklistItem(stageId: string) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== stageId
          ? n
          : {
              ...n,
              data: updatePathwayStageNodeChecklistItems(n.data, (items) => [
                ...items,
                {
                  id: `checklist-${crypto.randomUUID()}`,
                  label: "",
                },
              ]),
            },
      ),
    );
  }

  function updateChecklistItem(stageId: string, itemId: string, label: string) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== stageId
          ? n
          : {
              ...n,
              data: updatePathwayStageNodeChecklistItems(n.data, (items) =>
                items.map((item) => (item.id === itemId ? { ...item, label } : item)),
              ),
            },
      ),
    );
  }

  function removeChecklistItem(stageId: string, itemId: string) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== stageId
          ? n
          : {
              ...n,
              data: updatePathwayStageNodeChecklistItems(n.data, (items) =>
                items.filter((item) => item.id !== itemId),
              ),
            },
      ),
    );
  }

  function removeStage(id: string) {
    if (nodes.length <= 1) {
      toast.error(t("cannotRemoveLast"));
      return;
    }
    setNodes((nds) => normalizePathwayStageNodesPositions(nds.filter((n) => n.id !== id)));
  }

  if (error && !loading && !versionId) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive text-sm">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
          <RefreshCw className="size-4" />
          {t("loadError")}
        </Button>
      </div>
    );
  }

  if (loading || !versionId) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="has-data-[slot=card-footer]:pb-4">
        <CardContent className="space-y-2 pb-6 pt-6">
          <p className="text-muted-foreground text-sm">{t("listHint")}</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2" role="list">
                {nodes.map((node) => (
                  <li key={node.id} className="list-none">
                    <PathwaySortableStageRow
                      node={node}
                      onUpdateLabel={updateLabel}
                      onUpdateSla={updateSla}
                      onAddChecklistItem={addChecklistItem}
                      onUpdateChecklistItem={updateChecklistItem}
                      onRemoveChecklistItem={removeChecklistItem}
                      onRemove={removeStage}
                      disableRemove={nodes.length <= 1}
                    />
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={addStage}>
            <Plus className="size-4" />
            {tEditor("addStage")}
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {tEditor("save")}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void handlePublish()} disabled={publishing}>
            {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            {tEditor("publish")}
          </Button>
          <Button nativeButton={false} variant="ghost" size="sm" render={<Link href={`/dashboard/pathways/${pathwayId}`} />}>
            <ExternalLink className="size-4" />
            {t("openFlowEditor")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
