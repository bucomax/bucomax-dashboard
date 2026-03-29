import type { Node } from "@xyflow/react";

export type PathwayStagesColumnEditorProps = {
  pathwayId: string;
};

export type StageSlaField = "alertWarningDays" | "alertCriticalDays";

export type PathwaySortableStageRowProps = {
  node: Node;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateSla: (id: string, field: StageSlaField, value: number | undefined) => void;
  onAddChecklistItem: (id: string) => void;
  onUpdateChecklistItem: (id: string, itemId: string, label: string) => void;
  onRemoveChecklistItem: (id: string, itemId: string) => void;
  onRemove: (id: string) => void;
  disableRemove: boolean;
};
