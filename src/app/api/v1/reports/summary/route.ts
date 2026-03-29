import { prisma } from "@/infrastructure/database/prisma";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";
import { reportsSummaryQuerySchema } from "@/lib/validators/reports";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const parsed = reportsSummaryQuerySchema.safeParse({
    periodDays: url.searchParams.get("periodDays") ?? undefined,
    pathwayId: url.searchParams.get("pathwayId") ?? undefined,
    opmeSupplierId: url.searchParams.get("opmeSupplierId") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { periodDays, pathwayId, opmeSupplierId, page, limit } = parsed.data;
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * MS_PER_DAY);

  const patientPathwayWhere = {
    tenantId: tenantCtx.tenantId,
    createdAt: { gte: periodStart },
    ...(pathwayId ? { pathwayId } : {}),
    client: {
      deletedAt: null,
      ...(opmeSupplierId ? { opmeSupplierId } : {}),
    },
  };

  const SCAN_LIMIT = 5_000;
  const [rows, transitionsInPeriod] = await Promise.all([
    prisma.patientPathway.findMany({
      where: patientPathwayWhere,
      take: SCAN_LIMIT,
      select: {
        id: true,
        enteredStageAt: true,
        pathway: {
          select: {
            id: true,
            name: true,
          },
        },
        currentStage: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
            alertWarningDays: true,
            alertCriticalDays: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            opmeSupplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.stageTransition.count({
      where: {
        createdAt: { gte: periodStart },
        patientPathway: {
          tenantId: tenantCtx.tenantId,
          ...(pathwayId ? { pathwayId } : {}),
          client: {
            deletedAt: null,
            ...(opmeSupplierId ? { opmeSupplierId } : {}),
          },
        },
      },
    }),
  ]);

  const byStageMap = new Map<string, { id: string; label: string; count: number; sortOrder: number }>();
  const byPathwayMap = new Map<string, { id: string; label: string; count: number }>();
  const byOpmeMap = new Map<string, { id: string | null; label: string | null; count: number }>();
  const byStatus = {
    ok: 0,
    warning: 0,
    danger: 0,
  };

  const criticalRows = rows
    .map((row) => {
      const status = computeSlaHealthStatus(
        row.enteredStageAt,
        now,
        row.currentStage.alertWarningDays,
        row.currentStage.alertCriticalDays,
      );
      const daysInStage = Math.floor((now.getTime() - row.enteredStageAt.getTime()) / MS_PER_DAY);

      byStatus[status] += 1;

      const stageCurrent = byStageMap.get(row.currentStage.id);
      byStageMap.set(row.currentStage.id, {
        id: row.currentStage.id,
        label: row.currentStage.name,
        count: (stageCurrent?.count ?? 0) + 1,
        sortOrder: row.currentStage.sortOrder,
      });

      const pathwayCurrent = byPathwayMap.get(row.pathway.id);
      byPathwayMap.set(row.pathway.id, {
        id: row.pathway.id,
        label: row.pathway.name,
        count: (pathwayCurrent?.count ?? 0) + 1,
      });

      const opmeId = row.client.opmeSupplier?.id ?? "__unassigned__";
      const opmeCurrent = byOpmeMap.get(opmeId);
      byOpmeMap.set(opmeId, {
        id: row.client.opmeSupplier?.id ?? null,
        label: row.client.opmeSupplier?.name ?? null,
        count: (opmeCurrent?.count ?? 0) + 1,
      });

      return {
        patientPathwayId: row.id,
        clientId: row.client.id,
        clientName: row.client.name,
        phone: row.client.phone,
        pathwayName: row.pathway.name,
        stageName: row.currentStage.name,
        daysInStage,
        status,
        opmeSupplierName: row.client.opmeSupplier?.name ?? null,
      };
    })
    .filter((row) => row.status === "danger")
    .sort((a, b) => b.daysInStage - a.daysInStage);

  const offset = (page - 1) * limit;
  const pageRows = criticalRows.slice(offset, offset + limit);

  return jsonSuccess({
    generatedAt: now.toISOString(),
    filters: {
      periodDays,
      pathwayId: pathwayId ?? null,
      opmeSupplierId: opmeSupplierId ?? null,
    },
    kpis: {
      patientsInScope: rows.length,
      criticalPatients: criticalRows.length,
      transitionsInPeriod,
      pathwaysInScope: byPathwayMap.size,
    },
    byStage: [...byStageMap.values()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...row }) => row),
    byStatus: [
      { status: "ok", count: byStatus.ok },
      { status: "warning", count: byStatus.warning },
      { status: "danger", count: byStatus.danger },
    ],
    byPathway: [...byPathwayMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    byOpme: [...byOpmeMap.values()].sort(
      (a, b) => b.count - a.count || (a.label ?? "").localeCompare(b.label ?? ""),
    ),
    criticalPatients: {
      data: pageRows,
      pagination: buildPagination(page, limit, criticalRows.length),
    },
  });
}
