import { prisma } from "@/infrastructure/database/prisma";

type GetPathwayVersionParams = {
  tenantId: string;
  pathwayId: string;
  versionId: string;
};

type UpdateDraftPathwayVersionParams = GetPathwayVersionParams & {
  graphJson: object;
};

export type PathwayVersionRecord = {
  id: string;
  pathwayId: string;
  version: number;
  published: boolean;
  graphJson: unknown;
  createdAt: Date;
};

export async function getPathwayVersionForTenant({
  tenantId,
  pathwayId,
  versionId,
}: GetPathwayVersionParams): Promise<PathwayVersionRecord | null> {
  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId },
    select: { id: true },
  });

  if (!pathway) return null;

  const row = await prisma.pathwayVersion.findFirst({
    where: { id: versionId, pathwayId },
    select: {
      id: true,
      pathwayId: true,
      version: true,
      published: true,
      graphJson: true,
      createdAt: true,
    },
  });

  if (!row) return null;

  return row;
}

export async function updateDraftPathwayVersionForTenant({
  tenantId,
  pathwayId,
  versionId,
  graphJson,
}: UpdateDraftPathwayVersionParams): Promise<PathwayVersionRecord | "NOT_FOUND" | "CONFLICT"> {
  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId },
    select: { id: true },
  });

  if (!pathway) return "NOT_FOUND";

  const existing = await prisma.pathwayVersion.findFirst({
    where: { id: versionId, pathwayId },
    select: { id: true, published: true },
  });

  if (!existing) return "NOT_FOUND";
  if (existing.published) return "CONFLICT";

  return prisma.pathwayVersion.update({
    where: { id: versionId },
    data: { graphJson },
    select: {
      id: true,
      pathwayId: true,
      version: true,
      published: true,
      graphJson: true,
      createdAt: true,
    },
  });
}
