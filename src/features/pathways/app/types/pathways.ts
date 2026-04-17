export type PathwayListItem = {
  id: string;
  name: string;
  description: string | null;
  publishedVersion: { id: string; version: number } | null;
  createdAt: string;
  updatedAt: string;
};

export type PathwayDetail = {
  id: string;
  name: string;
  description: string | null;
  versions: { id: string; version: number; published: boolean; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
};

export type PathwayVersionDetail = {
  id: string;
  pathwayId: string;
  version: number;
  published: boolean;
  graphJson: unknown;
  createdAt: string;
};

export type CreatePathwayInput = {
  name: string;
  description?: string;
};

export type CreatedPathway = {
  id: string;
  name: string;
};

export type CreatedPathwayVersion = {
  id: string;
  version: number;
};

export type UpdatePathwayDraftInput = {
  graphJson: unknown;
};

export type PatchPathwayInput = {
  name?: string;
  description?: string | null;
};
