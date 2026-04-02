import { resolvePublishedPathwayVersion } from "@/infrastructure/database/pathway-published";
import { prisma } from "@/infrastructure/database/prisma";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { buildKanbanClientWhereForSession } from "@/lib/auth/client-visibility";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";
import { kanbanQuerySchema } from "@/lib/validators/kanban";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string }> };

const patientInclude = {
  client: { select: { id: true, name: true, phone: true } },
  currentStage: {
    select: {
      id: true,
      stageKey: true,
      name: true,
      sortOrder: true,
      alertWarningDays: true,
      alertCriticalDays: true,
    },
  },
  currentStageAssignee: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PatientPathwayInclude;

function mapPatientRow(
  pp: Prisma.PatientPathwayGetPayload<{ include: typeof patientInclude }>,
  slaStatus: ReturnType<typeof computeSlaHealthStatus>,
) {
  return {
    id: pp.id,
    enteredStageAt: pp.enteredStageAt.toISOString(),
    slaStatus,
    client: pp.client,
    currentStage: pp.currentStage,
    currentStageAssignee: pp.currentStageAssignee
      ? {
          id: pp.currentStageAssignee.id,
          name: pp.currentStageAssignee.name,
          email: pp.currentStageAssignee.email,
        }
      : null,
    updatedAt: pp.updatedAt.toISOString(),
  };
}

/** Fase 2: colunas + pacientes por etapa, com busca, filtro de status SLA e paginação por coluna (primeira página). */
export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId } = await ctx.params;

  const url = new URL(request.url);
  const parsed = kanbanQuerySchema.safeParse({
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") || undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    opmeSupplierId: url.searchParams.get("opmeSupplierId") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }
  const { search: searchRaw, status: statusFilter, limit, opmeSupplierId } = parsed.data;
  const search = searchRaw ?? "";

  const resolved = await resolvePublishedPathwayVersion(tenantCtx.tenantId, pathwayId);
  if (resolved.outcome === "PATHWAY_NOT_FOUND") {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }
  if (resolved.outcome === "NO_PUBLISHED_VERSION") {
    return jsonError("CONFLICT", apiT("errors.noPublishedVersion"), 409);
  }
  const { version } = resolved;
  const now = new Date();

  const clientWhere = await buildKanbanClientWhereForSession(
    auth.session!,
    tenantCtx.tenantId,
    search,
    opmeSupplierId,
  );

  const baseWhere: Prisma.PatientPathwayWhereInput = {
    tenantId: tenantCtx.tenantId,
    pathwayId,
    pathwayVersionId: version.id,
    completedAt: null,
    client: clientWhere,
  };

  const statusFetchCap = 500;

  const columns = await Promise.all(
    version.stages.map(async (stage) => {
      const where: Prisma.PatientPathwayWhereInput = {
        ...baseWhere,
        currentStageId: stage.id,
      };

      const stageDto = {
        id: stage.id,
        stageKey: stage.stageKey,
        name: stage.name,
        sortOrder: stage.sortOrder,
        patientMessage: stage.patientMessage,
        alertWarningDays: stage.alertWarningDays,
        alertCriticalDays: stage.alertCriticalDays,
      };

      if (!statusFilter) {
        const [totalItems, raw] = await Promise.all([
          prisma.patientPathway.count({ where }),
          prisma.patientPathway.findMany({
            where,
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: limit,
            include: patientInclude,
          }),
        ]);

        const data = raw.map((pp) => {
          const slaStatus = computeSlaHealthStatus(
            pp.enteredStageAt,
            now,
            pp.currentStage.alertWarningDays,
            pp.currentStage.alertCriticalDays,
          );
          return mapPatientRow(pp, slaStatus);
        });

        return {
          stage: stageDto,
          data,
          pagination: buildPagination(1, limit, totalItems),
        };
      }

      const raw = await prisma.patientPathway.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: statusFetchCap,
        include: patientInclude,
      });

      const withStatus = raw.map((pp) => {
        const slaStatus = computeSlaHealthStatus(
          pp.enteredStageAt,
          now,
          pp.currentStage.alertWarningDays,
          pp.currentStage.alertCriticalDays,
        );
        return { row: pp, slaStatus };
      });

      const filtered = withStatus.filter((x) => x.slaStatus === statusFilter);
      const sliced = filtered.slice(0, limit);
      const totalItems = filtered.length;
      const paginationBase = buildPagination(1, limit, totalItems);
      const pagination =
        raw.length === statusFetchCap
          ? { ...paginationBase, hasNextPage: true }
          : paginationBase;

      return {
        stage: stageDto,
        data: sliced.map(({ row: pp, slaStatus }) => mapPatientRow(pp, slaStatus)),
        pagination,
      };
    }),
  );

  return jsonSuccess({
    pathwayId,
    version: {
      id: version.id,
      version: version.version,
      published: version.published,
    },
    columns,
    query: {
      search: search || undefined,
      status: statusFilter,
      limit,
      opmeSupplierId,
    },
  });
}
