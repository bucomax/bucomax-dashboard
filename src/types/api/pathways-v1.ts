export type PathwayPublishPreviewDto = {
  canPublish: boolean;
  issues: {
    code: "GRAPH_EMPTY" | "INVALID_ASSIGNEES" | "REMOVED_STAGES_WITH_PATIENTS";
    message: string;
    stages?: { stageKey: string; name: string; patientCount: number }[];
  }[];
  publishedStagePatientCounts: {
    stageKey: string;
    name: string;
    patientCount: number;
  }[];
  proposedStageKeys: string[];
  removedStageKeys: string[];
  removedStagesWithPatients: {
    stageKey: string;
    name: string;
    patientCount: number;
  }[];
  removedStagesWithoutPatients: { stageKey: string; name: string }[];
};
