"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { PathwayStageChecklistBlock } from "@/features/pathways/app/components/pathway-stage-checklist-block";
import { PathwayStageDefaultAssigneesField } from "@/features/pathways/app/components/pathway-stage-default-assignees-field";
import { PathwayStageDocumentsBlock } from "@/features/pathways/app/components/pathway-stage-documents-block";
import type { PathwaySortableStageRowProps } from "@/features/pathways/app/types/column-editor";
import { normalizeStageDefaultAssigneeUserIds } from "@/domain/pathway/graph-normalizer";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { LabeledNonNegativeIntegerUnitField } from "@/shared/components/forms";

export function PathwaySortableStageRow({
  node,
  assigneeOptions,
  onUpdateDefaultAssignees,
  onUpdateLabel,
  onUpdateSla,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onUpdateChecklistItemRequired,
  onRemoveChecklistItem,
  onAddStageDocuments,
  onRemoveStageDocument,
  onRemove,
  disableRemove,
}: PathwaySortableStageRowProps) {
  const t = useTranslations("pathways.columnEditor");
  const tEditor = useTranslations("pathways.editor");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const data = node.data as Record<string, unknown> | undefined;
  const label = String(data?.label ?? "");
  const warnRaw = data?.alertWarningDays;
  const critRaw = data?.alertCriticalDays;
  const warnDays =
    typeof warnRaw === "number" && Number.isFinite(warnRaw) ? Math.max(0, Math.floor(warnRaw)) : undefined;
  const critDays =
    typeof critRaw === "number" && Number.isFinite(critRaw) ? Math.max(0, Math.floor(critRaw)) : undefined;
  const assigneeIds = normalizeStageDefaultAssigneeUserIds(data);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:flex-wrap sm:items-start",
        isDragging && "opacity-60 ring-2 ring-ring",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-md border border-dashed"
        aria-label={t("dragHandleAria")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="grid min-w-0 flex-1 grid-cols-1 gap-3">
        <Field className="min-w-0">
          <FieldLabel htmlFor={`stage-name-${node.id}`}>{t("stageName")}</FieldLabel>
          <Input
            id={`stage-name-${node.id}`}
            value={label}
            onChange={(e) => onUpdateLabel(node.id, e.target.value)}
          />
        </Field>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <LabeledNonNegativeIntegerUnitField
            id={`stage-warn-${node.id}`}
            label={t("alertWarningDays")}
            unitLabel={t("daysUnit")}
            value={warnDays}
            onChange={(v) => onUpdateSla(node.id, "alertWarningDays", v)}
          />
          <LabeledNonNegativeIntegerUnitField
            id={`stage-crit-${node.id}`}
            label={t("alertCriticalDays")}
            unitLabel={t("daysUnit")}
            value={critDays}
            onChange={(v) => onUpdateSla(node.id, "alertCriticalDays", v)}
          />
        </div>
        <PathwayStageDefaultAssigneesField
          idPrefix={`stage-${node.id}`}
          selectedUserIds={assigneeIds}
          memberOptions={assigneeOptions}
          onChange={(ids) => onUpdateDefaultAssignees(node.id, ids)}
          label={tEditor("defaultAssigneeLabel")}
          compact
        />
      </div>

      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="mt-0.5 shrink-0 self-start"
        disabled={disableRemove}
        onClick={() => onRemove(node.id)}
        aria-label={t("removeStageAria")}
      >
        <Trash2 className="size-4" />
      </Button>

      <div className="border-border/55 mt-2 flex w-full min-w-0 basis-full flex-col gap-0 border-t pt-6">
        <PathwayStageChecklistBlock
          noSectionBorder
          checklistItems={data?.checklistItems}
          onAdd={() => onAddChecklistItem(node.id)}
          onUpdate={(itemId, label) => onUpdateChecklistItem(node.id, itemId, label)}
          onUpdateRequired={(itemId, required) =>
            onUpdateChecklistItemRequired(node.id, itemId, required)
          }
          onRemove={(itemId) => onRemoveChecklistItem(node.id, itemId)}
        />
        <PathwayStageDocumentsBlock
          stageDocuments={data?.stageDocuments}
          onDocumentsAdded={(items) => onAddStageDocuments(node.id, items)}
          onRemove={(fileAssetId) => onRemoveStageDocument(node.id, fileAssetId)}
        />
      </div>
    </div>
  );
}
