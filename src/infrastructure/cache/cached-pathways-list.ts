import { unstable_cache } from "next/cache";
import { prisma } from "@/infrastructure/database/prisma";
import { CACHE_REVALIDATE_SEC } from "@/infrastructure/cache/cache-config";
import { tenantPathwaysListTag } from "@/infrastructure/cache/cache-tags";

export type CachedPathwayListItem = {
  id: string;
  name: string;
  description: string | null;
  publishedVersion: { id: string; version: number } | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Lista de jornadas do tenant — resposta já em DTO serializável (sem `Date` cru).
 */
export async function getCachedPathwaysList(tenantId: string): Promise<{ pathways: CachedPathwayListItem[] }> {
  return unstable_cache(
    async () => {
      const rows = await prisma.carePathway.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
        include: {
          versions: {
            where: { published: true },
            orderBy: { version: "desc" },
            take: 1,
            select: { id: true, version: true },
          },
        },
      });

      return {
        pathways: rows.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          publishedVersion: p.versions[0] ?? null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      };
    },
    ["pathways-list-v1", tenantId],
    {
      revalidate: CACHE_REVALIDATE_SEC.pathwaysList,
      tags: [tenantPathwaysListTag(tenantId)],
    },
  )();
}
