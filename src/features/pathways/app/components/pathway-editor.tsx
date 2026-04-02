"use client";

import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PATHWAY_STAGE_NONE_ASSIGNEE } from "@/features/pathways/app/constants/stage-default-assignee";
import { PathwayStageChecklistBlock } from "@/features/pathways/app/components/pathway-stage-checklist-block";
import { PathwayStageDefaultAssigneesField } from "@/features/pathways/app/components/pathway-stage-default-assignees-field";
import { PathwayStageDocumentsBlock } from "@/features/pathways/app/components/pathway-stage-documents-block";
import { usePathwayDraftVersion } from "@/features/pathways/app/hooks/use-pathway-draft-version";
import { listTenantMembersForPicker } from "@/features/settings/app/services/tenant-settings.service";
import { parsePathwayGraph } from "@/features/pathways/app/utils/pathway-graph";
import { normalizeStageDefaultAssigneeUserIds } from "@/lib/pathway/graph";
import { setStageNodeDefaultAssignees } from "@/lib/pathway/stage-node-assignees";
import {
  updatePathwayStageNodeChecklistItems,
  updatePathwayStageNodeStageDocuments,
} from "@/features/pathways/app/utils/pathway-stage-nodes";
import type { PathwayEditorProps, SelectedPathwayNodeUpdate } from "@/features/pathways/types/components";
import type { StageSlaField } from "@/features/pathways/types/column-editor";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { LabeledNonNegativeIntegerUnitField } from "@/shared/components/forms";
import type { LabeledSelectOption } from "@/shared/components/forms/labeled-select";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Loader2, Plus, RefreshCw, Rocket, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

function PathwayEditorInner({ pathwayId }: PathwayEditorProps) {
  const t = useTranslations("pathways.editor");
  const tCol = useTranslations("pathways.columnEditor");
  const { resolvedTheme } = useTheme();
  const reactFlowColorMode = resolvedTheme === "dark" ? "dark" : "light";
  const {
    loading,
    error,
    versionId,
    graphJson,
    pathwayName,
    setPathwayName,
    saving,
    publishing,
    saveDraft,
    publishDraft,
    reload,
  } = usePathwayDraftVersion(pathwayId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assigneeOptions, setAssigneeOptions] = useState<LabeledSelectOption[]>([]);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const noneAssigneeLabel = t("defaultAssigneeNone");
  useEffect(() => {
    let cancelled = false;
    void listTenantMembersForPicker({ skipErrorToast: true })
      .then((data) => {
        if (cancelled) return;
        setAssigneeOptions([
          { value: PATHWAY_STAGE_NONE_ASSIGNEE, label: noneAssigneeLabel },
          ...data.members.map((m) => ({
            value: m.userId,
            label: m.name?.trim() ? `${m.name} (${m.email})` : m.email,
          })),
        ]);
      })
      .catch(() => {
        if (!cancelled) {
          setAssigneeOptions([{ value: PATHWAY_STAGE_NONE_ASSIGNEE, label: noneAssigneeLabel }]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [noneAssigneeLabel]);

  useEffect(() => {
    if (graphJson == null) return;
    const parsed = parsePathwayGraph(graphJson);
    setNodes(parsed.nodes);
    setEdges(parsed.edges);
    setSelectedId(null);
  }, [graphJson, setEdges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges],
  );

  async function handleSave() {
    if (!versionId) return;
    try {
      await saveDraft({ nodes, edges });
      toast.success(t("saveSuccess"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("saveError");
      toast.error(msg);
    }
  }

  async function handlePublish() {
    if (!versionId) return;
    try {
      await publishDraft({ nodes, edges });
      toast.success(t("publishSuccess"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("publishError");
      toast.error(msg);
    }
  }

  function addStage() {
    const id = `stage-${crypto.randomUUID()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "default",
        position: { x: 40 + nds.length * 24, y: 40 + nds.length * 24 },
        data: { label: `${t("defaultStageLabel")} ${nds.length + 1}`, patientMessage: "" },
      },
    ]);
    setSelectedId(id);
  }

  function removeSelectedStage() {
    if (!selectedId) return;
    if (nodes.length <= 1) {
      toast.error(t("cannotRemoveLastStage"));
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  }

  function updateSelectedData(partial: SelectedPathwayNodeUpdate) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId
          ? {
              ...n,
              data: {
                ...n.data,
                ...(partial.label !== undefined ? { label: partial.label } : {}),
                ...(partial.patientMessage !== undefined ? { patientMessage: partial.patientMessage } : {}),
              },
            }
          : n,
      ),
    );
  }

  function updateSelectedSla(field: StageSlaField, value: number | undefined) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedId) return n;
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

  function updateSelectedDefaultAssignees(userIds: string[]) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedId) return n;
        const nextData = { ...n.data } as Record<string, unknown>;
        setStageNodeDefaultAssignees(nextData, userIds);
        return { ...n, data: nextData };
      }),
    );
  }

  function addChecklistItemSelected() {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== selectedId
          ? n
          : {
              ...n,
              data: updatePathwayStageNodeChecklistItems(n.data, (items) => [
                ...items,
                { id: `checklist-${crypto.randomUUID()}`, label: "" },
              ]),
            },
      ),
    );
  }

  function updateChecklistItemSelected(itemId: string, label: string) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== selectedId
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

  function updateChecklistItemRequiredSelected(itemId: string, requiredForTransition: boolean) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== selectedId
          ? n
          : {
              ...n,
              data: updatePathwayStageNodeChecklistItems(n.data, (items) =>
                items.map((item) => {
                  if (item.id !== itemId) return item;
                  if (!requiredForTransition) {
                    const { requiredForTransition: _r, ...rest } = item;
                    return rest;
                  }
                  return { ...item, requiredForTransition: true };
                }),
              ),
            },
      ),
    );
  }

  function removeChecklistItemSelected(itemId: string) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== selectedId
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

  function addStageDocumentsSelected(items: { fileAssetId: string; fileName: string; mimeType: string }[]) {
    if (!selectedId || items.length === 0) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== selectedId
          ? n
          : {
              ...n,
              data: updatePathwayStageNodeStageDocuments(n.data, (docs) => [...docs, ...items]),
            },
      ),
    );
  }

  function removeStageDocumentSelected(fileAssetId: string) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== selectedId
          ? n
          : {
              ...n,
              data: updatePathwayStageNodeStageDocuments(n.data, (docs) =>
                docs.filter((d) => d.fileAssetId !== fileAssetId),
              ),
            },
      ),
    );
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
        <Skeleton className="h-[420px] w-full rounded-xl" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  const selectedData = selectedNode?.data as Record<string, unknown> | undefined;
  const warnRaw = selectedData?.alertWarningDays;
  const critRaw = selectedData?.alertCriticalDays;
  const warnDays =
    typeof warnRaw === "number" && Number.isFinite(warnRaw) ? Math.max(0, Math.floor(warnRaw)) : undefined;
  const critDays =
    typeof critRaw === "number" && Number.isFinite(critRaw) ? Math.max(0, Math.floor(critRaw)) : undefined;

  const selectedAssigneeIds = normalizeStageDefaultAssigneeUserIds(
    selectedData as Parameters<typeof normalizeStageDefaultAssigneeUserIds>[0],
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(280px,380px)]">
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b py-4">
          <Field className="min-w-0">
            <FieldLabel htmlFor="pathway-name">{t("pathwayName")}</FieldLabel>
            <Input
              id="pathway-name"
              value={pathwayName}
              onChange={(e) => setPathwayName(e.target.value)}
              placeholder={t("pathwayNamePlaceholder")}
              autoComplete="off"
            />
          </Field>
        </CardHeader>
        <div className="h-[min(520px,70vh)] w-full">
          <ReactFlow
            colorMode={reactFlowColorMode}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            nodesDraggable
            nodesConnectable
            elementsSelectable
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        <CardFooter className="flex flex-wrap gap-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={addStage}>
            <Plus className="size-4" />
            {t("addStage")}
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t("save")}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void handlePublish()} disabled={publishing}>
            {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            {t("publish")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stagePropsTitle")}</CardTitle>
          <CardDescription>{t("stagePropsDescription")}</CardDescription>
          {selectedNode ? (
            <CardAction>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="inline-flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={nodes.length <= 1}
                        onClick={removeSelectedStage}
                        aria-label={t("removeStageAria")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </span>
                  }
                />
                <TooltipContent side="left">
                  {nodes.length <= 1 ? t("cannotRemoveLastStage") : t("removeStage")}
                </TooltipContent>
              </Tooltip>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          {!selectedNode ? (
            <p className="text-muted-foreground text-sm">{t("selectNode")}</p>
          ) : (
            <>
              <div className="grid gap-3">
                <Field className="min-w-0">
                  <FieldLabel htmlFor="stage-label">{tCol("stageName")}</FieldLabel>
                  <Input
                    id="stage-label"
                    value={String(selectedNode.data?.label ?? "")}
                    onChange={(e) => updateSelectedData({ label: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <LabeledNonNegativeIntegerUnitField
                    id="stage-warn"
                    label={tCol("alertWarningDays")}
                    unitLabel={tCol("daysUnit")}
                    value={warnDays}
                    onChange={(v) => updateSelectedSla("alertWarningDays", v)}
                  />
                  <LabeledNonNegativeIntegerUnitField
                    id="stage-crit"
                    label={tCol("alertCriticalDays")}
                    unitLabel={tCol("daysUnit")}
                    value={critDays}
                    onChange={(v) => updateSelectedSla("alertCriticalDays", v)}
                  />
                </div>
                <PathwayStageDefaultAssigneesField
                  idPrefix="flow-selected"
                  selectedUserIds={selectedAssigneeIds}
                  memberOptions={
                    assigneeOptions.length > 0
                      ? assigneeOptions
                      : [{ value: PATHWAY_STAGE_NONE_ASSIGNEE, label: noneAssigneeLabel }]
                  }
                  onChange={updateSelectedDefaultAssignees}
                  label={t("defaultAssigneeLabel")}
                />
              </div>
              <Field>
                <FieldLabel htmlFor="stage-msg">{t("patientMessage")}</FieldLabel>
                <textarea
                  id="stage-msg"
                  rows={4}
                  value={String(selectedNode.data?.patientMessage ?? "")}
                  onChange={(e) => updateSelectedData({ patientMessage: e.target.value })}
                  className={cn(
                    "border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full rounded-lg border px-2.5 py-2 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
                  )}
                />
              </Field>
              <PathwayStageChecklistBlock
                checklistItems={selectedNode.data?.checklistItems}
                onAdd={addChecklistItemSelected}
                onUpdate={updateChecklistItemSelected}
                onUpdateRequired={updateChecklistItemRequiredSelected}
                onRemove={removeChecklistItemSelected}
              />
              <PathwayStageDocumentsBlock
                stageDocuments={selectedNode.data?.stageDocuments}
                onDocumentsAdded={addStageDocumentsSelected}
                onRemove={removeStageDocumentSelected}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PathwayEditor(props: PathwayEditorProps) {
  return (
    <ReactFlowProvider>
      <PathwayEditorInner {...props} />
    </ReactFlowProvider>
  );
}
