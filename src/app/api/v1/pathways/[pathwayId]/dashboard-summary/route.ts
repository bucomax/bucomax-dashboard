import { resolvePublishedPathwayVersion } from "@/infrastructure/database/pathway-published";
import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { buildKanbanClientNestedWhere } from "@/lib/pathway/kanban-client-where";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";
import { dashboardPathwayOpmeQuerySchema } from "@/lib/validators/kanban";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string }> };

/** Métricas dos 4 cards do dashboard (totais por faixa SLA) para uma jornada com versão publicada. */
export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId } = await ctx.params;

  const url = new URL(request.url);
  const parsedOpme = dashboardPathwayOpmeQuerySchema.safeParse({
    opmeSupplierId: url.searchParams.get("opmeSupplierId") ?? undefined,
  });
  if (!parsedOpme.success) {
    return jsonError("VALIDATION_ERROR", parsedOpme.error.flatten().formErrors.join("; "), 422);
  }
  const { opmeSupplierId } = parsedOpme.data;

  const resolved = await resolvePublishedPathwayVersion(tenantCtx.tenantId, pathwayId);
  if (resolved.outcome === "PATHWAY_NOT_FOUND") {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }
  if (resolved.outcome === "NO_PUBLISHED_VERSION") {
    return jsonError("CONFLICT", apiT("errors.noPublishedVersion"), 409);
  }
  const { version } = resolved;
  const now = new Date();

  const SCAN_LIMIT = 5_000;
  const rows = await prisma.patientPathway.findMany({
    where: {
      tenantId: tenantCtx.tenantId,
      pathwayId,
      pathwayVersionId: version.id,
      completedAt: null,
      client: buildKanbanClientNestedWhere("", opmeSupplierId),
    },
    select: {
      enteredStageAt: true,
      currentStage: {
        select: { alertWarningDays: true, alertCriticalDays: true },
      },
    },
    take: SCAN_LIMIT,
  });

  let ok = 0;
  let warning = 0;
  let danger = 0;
  for (const r of rows) {
    const s = computeSlaHealthStatus(
      r.enteredStageAt,
      now,
      r.currentStage.alertWarningDays,
      r.currentStage.alertCriticalDays,
    );
    if (s === "ok") ok += 1;
    else if (s === "warning") warning += 1;
    else danger += 1;
  }

  return jsonSuccess({
    pathwayId,
    version: {
      id: version.id,
      version: version.version,
    },
    totals: {
      total: rows.length,
      ok,
      warning,
      danger,
    },
  });
}
