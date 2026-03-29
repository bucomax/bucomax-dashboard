export type PatchPatientChecklistItemRequestBody = {
  completed: boolean;
};

export type PatientChecklistItemProgressDto = {
  checklistItemId: string;
  completed: boolean;
  completedAt: string | null;
};

export type PatchPatientChecklistItemResponseData = {
  item: PatientChecklistItemProgressDto;
};
