import type { Session } from "next-auth";

import { getClientsListPageWithoutCache } from "@/infrastructure/cache/cached-clients-list";
import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";
import { buildPagination, type ApiPagination } from "@/lib/api/pagination";
import {
  loadTenantMembershipClientScope,
  mergeClientWhereWithVisibility,
} from "@/application/use-cases/shared/load-client-visibility-scope";
import {
  buildClientsListBaseWhere,
  serializeClientListItem,
  type ClientListRow,
} from "@/application/use-cases/client/serialize-client-list";
import type { ClientsListQuery } from "@/lib/validators/clients-list-query";

/** Tamanho do lote quando o status SLA exige cálculo em memória (sem cache). */
const STATUS_FILTER_SCAN_BATCH = 400;

export type ListClientsPageSuccess = {
  data: ReturnType<typeof serializeClientListItem>[];
  pagination: ApiPagination;
  statusFilterCapped: boolean;
};

/**
 * Lista paginada de pacientes (dashboard): RBAC, filtro opcional por SLA/status em memória ou página SQL.
 */
export async function runListClientsPage(params: {
  tenantId: string;
  session: Session;
  query: ClientsListQuery;
}): Promise<ListClientsPageSuccess> {
  const { tenantId, session, query } = params;
  const { limit, page, q, pathwayId, stageId, status: statusFilter } = query;

  const clientScope = await loadTenantMembershipClientScope(
    session.user.id,
    tenantId,
    session.user.globalRole,
  );

  const offset = (page - 1) * limit;
  const now = new Date();

  const baseWhere = buildClientsListBaseWhere({ tenantId, q, pathwayId, stageId });
  const where = mergeClientWhereWithVisibility(baseWhere, clientScope, session.user.id);

  if (statusFilter) {
    const pageRows: ReturnType<typeof serializeClientListItem>[] = [];
    let matchedCount = 0;
    let skip = 0;

    while (true) {
      const batch = await clientPrismaRepository.findManyForClientsListScan({
        where,
        skip,
        take: STATUS_FILTER_SCAN_BATCH,
      });
      if (batch.length === 0) break;

      for (const client of batch) {
        const row = serializeClientListItem(client as ClientListRow, now);
        const matchesStatus =
          statusFilter === "completed"
            ? row.journeyCompletedAt != null
            : row.slaStatus === statusFilter;
        if (!matchesStatus) continue;
        if (matchedCount >= offset && pageRows.length < limit) {
          pageRows.push(row);
        }
        matchedCount += 1;
      }

      if (batch.length < STATUS_FILTER_SCAN_BATCH) break;
      skip += batch.length;
    }

    return {
      data: pageRows,
      pagination: buildPagination(page, limit, matchedCount),
      statusFilterCapped: false,
    };
  }

  const { items, total } = await getClientsListPageWithoutCache({
    tenantId,
    viewerUserId: session.user.id,
    globalRole: session.user.globalRole,
    scope: clientScope,
    limit,
    page,
    q,
    pathwayId,
    stageId,
  });

  return {
    data: items.map((c) => serializeClientListItem(c, now)),
    pagination: buildPagination(page, limit, total),
    statusFilterCapped: false,
  };
}
