import type { Node } from "@xyflow/react";
import type { LabeledSelectOption } from "@/shared/components/forms/labeled-select";

export type PathwayStagesColumnEditorProps = {
  pathwayId: string;
};

export type StageSlaField = "alertWarningDays" | "alertCriticalDays";

export type PathwaySortableStageRowProps = {
  node: Node;
  assigneeOptions: LabeledSelectOption[];
  onUpdateDefaultAssignees: (stageId: string, userIds: string[]) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateSla: (id: string, field: StageSlaField, value: number | undefined) => void;
  onAddChecklistItem: (id: string) => void;
  onUpdateChecklistItem: (id: string, itemId: string, label: string) => void;
  onUpdateChecklistItemRequired: (id: string, itemId: string, requiredForTransition: boolean) => void;
  onRemoveChecklistItem: (id: string, itemId: string) => void;
  onAddStageDocuments: (
    stageId: string,
    items: { fileAssetId: string; fileName: string; mimeType: string }[],
  ) => void;
  onRemoveStageDocument: (stageId: string, fileAssetId: string) => void;
  onRemove: (id: string) => void;
  disableRemove: boolean;
};
