import { unstable_cache } from "next/cache";
import { prisma } from "@/infrastructure/database/prisma";
import { CACHE_REVALIDATE_SEC } from "@/infrastructure/cache/cache-config";
import { tenantOpmeSuppliersListTag } from "@/infrastructure/cache/cache-tags";

type ListArgs = {
  tenantId: string;
  limit: number;
  page: number;
  q?: string;
  includeInactive: boolean;
};

export type CachedOpmeRow = {
  id: string;
  name: string;
  active: boolean;
  activePatientsCount: number;
};

/**
 * Listagem OPME paginada com cache por combinação de filtros.
 */
export async function getCachedOpmeSuppliersPage(args: ListArgs): Promise<{
  data: CachedOpmeRow[];
  totalItems: number;
}> {
  const { tenantId, limit, page, q, includeInactive } = args;
  const offset = (page - 1) * limit;

  const cacheKey = [
    "opme-suppliers-list-v1",
    tenantId,
    String(limit),
    String(page),
    q ?? "",
    String(includeInactive),
  ];

  return unstable_cache(
    async () => {
      const where = {
        tenantId,
        ...(includeInactive ? {} : { active: true }),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      };

      const [suppliers, totalItems] = await Promise.all([
        prisma.opmeSupplier.findMany({
          where,
          orderBy: { name: "asc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            name: true,
            active: true,
            _count: {
              select: {
                clients: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        }),
        prisma.opmeSupplier.count({ where }),
      ]);

      return {
        data: suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          active: supplier.active,
          activePatientsCount: supplier._count.clients,
        })),
        totalItems,
      };
    },
    cacheKey,
    {
      revalidate: CACHE_REVALIDATE_SEC.opmeSuppliersList,
      tags: [tenantOpmeSuppliersListTag(tenantId)],
    },
  )();
}
