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
import {
  getPathway,
  getPathwayVersion,
  patchPathwayVersionDraft,
  postPathwayVersion,
  publishPathwayVersion,
} from "@/features/pathways/app/services/pathways.service";
import { createDefaultPathwayGraph } from "@/features/pathways/app/utils/default-graph";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type PathwayEditorProps = {
  pathwayId: string;
};

function parseGraph(graphJson: unknown): { nodes: Node[]; edges: Edge[] } {
  const g = graphJson as { nodes?: Node[]; edges?: Edge[] };
  return {
    nodes: Array.isArray(g.nodes) ? g.nodes : [],
    edges: Array.isArray(g.edges) ? g.edges : [],
  };
}

function PathwayEditorInner({ pathwayId }: PathwayEditorProps) {
  const t = useTranslations("pathways.editor");
  const [loading, setLoading] = useState(true);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pathway = await getPathway(pathwayId);
      const drafts = pathway.versions.filter((v) => !v.published).sort((a, b) => b.version - a.version);
      let vid: string;
      let vNum: number;

      if (drafts[0]) {
        vid = drafts[0].id;
        const detail = await getPathwayVersion(pathwayId, vid);
        vNum = detail.version;
        const parsed = parseGraph(detail.graphJson);
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
      } else {
        const publishedList = pathway.versions.filter((v) => v.published).sort((a, b) => b.version - a.version);
        if (publishedList[0]) {
          const prev = await getPathwayVersion(pathwayId, publishedList[0].id);
          const created = await postPathwayVersion(pathwayId, prev.graphJson);
          vid = created.id;
          vNum = created.version;
          const parsed = parseGraph(prev.graphJson);
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
        } else {
          const empty = createDefaultPathwayGraph();
          const created = await postPathwayVersion(pathwayId, empty);
          vid = created.id;
          vNum = created.version;
          const parsed = parseGraph(empty);
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
        }
      }

      setVersionId(vid);
      setVersionNumber(vNum);
      setSelectedId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [pathwayId, setEdges, setNodes, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges],
  );

  async function handleSave() {
    if (!versionId) return;
    setSaving(true);
    try {
      await patchPathwayVersionDraft(pathwayId, versionId, { nodes, edges });
      toast.success(t("saveSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!versionId) return;
    setPublishing(true);
    try {
      await patchPathwayVersionDraft(pathwayId, versionId, { nodes, edges });
      await publishPathwayVersion(pathwayId, versionId);
      toast.success(t("publishSuccess"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("publishError"));
    } finally {
      setPublishing(false);
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

  function updateSelectedData(partial: { label?: string; patientMessage?: string }) {
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

  if (loading || !versionId) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[420px] w-full rounded-xl" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden p-0">
        <div className="h-[min(520px,70vh)] w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("save")}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void handlePublish()} disabled={publishing}>
            {publishing ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("publish")}
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("metaTitle")}</CardTitle>
            <CardDescription>
              {t("versionLabel")} {versionNumber ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {t("draftHint")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("stagePropsTitle")}</CardTitle>
            <CardDescription>{t("stagePropsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedNode ? (
              <p className="text-muted-foreground text-sm">{t("selectNode")}</p>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="stage-label">{t("stageName")}</FieldLabel>
                  <Input
                    id="stage-label"
                    value={String(selectedNode.data?.label ?? "")}
                    onChange={(e) => updateSelectedData({ label: e.target.value })}
                  />
                </Field>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
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
