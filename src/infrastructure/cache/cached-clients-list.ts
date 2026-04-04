import { unstable_cache } from "next/cache";
import { prisma } from "@/infrastructure/database/prisma";
import { CACHE_REVALIDATE_SEC } from "@/infrastructure/cache/cache-config";
import { tenantClientsListTag } from "@/infrastructure/cache/cache-tags";
import type { TenantMembershipClientScope } from "@/lib/auth/client-visibility";
import { mergeClientWhereWithVisibility } from "@/lib/auth/client-visibility";
import {
  buildClientsListBaseWhere,
  CLIENT_LIST_INCLUDE,
  reviveClientListRows,
  type ClientListRow,
} from "@/lib/clients/clients-list-shared";

type CachedClientsListArgs = {
  tenantId: string;
  viewerUserId: string;
  globalRole: string;
  scope: TenantMembershipClientScope;
  limit: number;
  page: number;
  q?: string;
  pathwayId?: string;
  stageId?: string;
};

/**
 * Listagem paginada de clientes com `unstable_cache`:
 * - várias requisições com a mesma chave no TTL fazem **single-flight** (mitiga stampede no miss);
 * - SLA (`daysInStage` / status) é recalculado na resposta com `now` atual após reidratar `Date`.
 *
 * O filtro `status` (SLA em memória) **não** passa por aqui — continua sem cache no route.
 */
export async function getCachedClientsListPage(args: CachedClientsListArgs): Promise<{
  items: ClientListRow[];
  total: number;
}> {
  const { tenantId, viewerUserId, globalRole, scope, limit, page, q, pathwayId, stageId } = args;
  const offset = (page - 1) * limit;

  const cacheKey = [
    "clients-list-v1",
    tenantId,
    viewerUserId,
    globalRole,
    scope.role,
    String(scope.restrictedToAssignedOnly),
    scope.linkedOpmeSupplierId ?? "none",
    String(limit),
    String(page),
    q ?? "",
    pathwayId ?? "",
    stageId ?? "",
  ];

  const raw = await unstable_cache(
    async () => {
      const baseWhere = buildClientsListBaseWhere({ tenantId, q, pathwayId, stageId });
      const where = mergeClientWhereWithVisibility(baseWhere, scope, viewerUserId);
      const [items, total] = await Promise.all([
        prisma.client.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip: offset,
          include: CLIENT_LIST_INCLUDE,
        }),
        prisma.client.count({ where }),
      ]);
      return { items, total };
    },
    cacheKey,
    {
      revalidate: CACHE_REVALIDATE_SEC.clientsList,
      tags: [tenantClientsListTag(tenantId)],
    },
  )();

  return {
    items: reviveClientListRows(raw.items),
    total: raw.total,
  };
}
