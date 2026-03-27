export type ClientDto = {
  id: string;
  name: string;
  phone: string;
  caseDescription: string | null;
  documentId: string | null;
  patientPathwayId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PathwayOption = {
  id: string;
  name: string;
  description: string | null;
  publishedVersion: { id: string; version: number } | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientPathwayCreated = {
  id: string;
  client: { id: string; name: string; phone: string };
  pathway: { id: string; name: string };
  currentStage: { id: string; name: string; stageKey: string };
  createdAt: string;
};
