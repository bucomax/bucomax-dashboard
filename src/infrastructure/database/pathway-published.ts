import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma } from "@prisma/client";

export type PublishedPathwayVersionWithStages = Prisma.PathwayVersionGetPayload<{
  include: { stages: true };
}>;

/**
 * Resolve a versão publicada mais recente da jornada no tenant.
 * - `PATHWAY_NOT_FOUND`: id inválido ou outro tenant
 * - `NO_PUBLISHED_VERSION`: jornada existe mas nada publicado
 */
export async function resolvePublishedPathwayVersion(
  tenantId: string,
  pathwayId: string,
): Promise<
  | { outcome: "PATHWAY_NOT_FOUND" }
  | { outcome: "NO_PUBLISHED_VERSION" }
  | { outcome: "OK"; version: PublishedPathwayVersionWithStages }
> {
  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return { outcome: "PATHWAY_NOT_FOUND" };
  }

  const version = await prisma.pathwayVersion.findFirst({
    where: { pathwayId, published: true },
    orderBy: { version: "desc" },
    include: {
      stages: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!version) {
    return { outcome: "NO_PUBLISHED_VERSION" };
  }

  return { outcome: "OK", version };
}
