import { resolvePublishedPathwayVersion } from "@/infrastructure/database/pathway-published";
import { prisma } from "@/infrastructure/database/prisma";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { buildKanbanClientWhereForSession } from "@/lib/auth/client-visibility";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";
import { kanbanColumnPatientsQuerySchema } from "@/lib/validators/kanban";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string; stageId: string }> };

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

/** Paginação por página (`page` 1-based). Sem filtro `status` — use o Kanban agregado para filtrar por SLA. */
export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId, stageId } = await ctx.params;

  const url = new URL(request.url);
  const parsed = kanbanColumnPatientsQuerySchema.safeParse({
    search: url.searchParams.get("search") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    opmeSupplierId: url.searchParams.get("opmeSupplierId") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }
  const { search: searchRaw, limit, page, opmeSupplierId } = parsed.data;
  const search = searchRaw ?? "";
  const offset = (page - 1) * limit;

  const resolved = await resolvePublishedPathwayVersion(tenantCtx.tenantId, pathwayId);
  if (resolved.outcome === "PATHWAY_NOT_FOUND") {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }
  if (resolved.outcome === "NO_PUBLISHED_VERSION") {
    return jsonError("CONFLICT", apiT("errors.noPublishedVersion"), 409);
  }
  const { version } = resolved;

  const stage = version.stages.find((s) => s.id === stageId);
  if (!stage) {
    return jsonError("NOT_FOUND", apiT("errors.stageNotInPublishedVersion"), 404);
  }

  const now = new Date();

  const clientWhere = await buildKanbanClientWhereForSession(
    auth.session!,
    tenantCtx.tenantId,
    search,
    opmeSupplierId,
  );

  const listWhere: Prisma.PatientPathwayWhereInput = {
    tenantId: tenantCtx.tenantId,
    pathwayId,
    pathwayVersionId: version.id,
    currentStageId: stageId,
    completedAt: null,
    client: clientWhere,
  };

  const [totalItems, raw] = await Promise.all([
    prisma.patientPathway.count({ where: listWhere }),
    prisma.patientPathway.findMany({
      where: listWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
      include: patientInclude,
    }),
  ]);

  return jsonSuccess({
    data: raw.map((pp) => ({
      id: pp.id,
      enteredStageAt: pp.enteredStageAt.toISOString(),
      slaStatus: computeSlaHealthStatus(
        pp.enteredStageAt,
        now,
        pp.currentStage.alertWarningDays,
        pp.currentStage.alertCriticalDays,
      ),
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
    })),
    pagination: buildPagination(page, limit, totalItems),
  });
}
