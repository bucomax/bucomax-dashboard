import { resolvePublishedPathwayVersion } from "@/infrastructure/database/pathway-published";
import { prisma } from "@/infrastructure/database/prisma";
import { checkAndEmitSlaNotifications } from "@/infrastructure/notifications/sla-notification-check";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { buildKanbanClientWhereForSession } from "@/lib/auth/client-visibility";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";
import { dashboardPathwayOpmeQuerySchema } from "@/lib/validators/kanban";
import { z } from "zod";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string }> };

const querySchema = dashboardPathwayOpmeQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/** Alertas MVP: pacientes em estado **danger** (SLA crítico), ordenados por dias na etapa (piores primeiro). */
export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId } = await ctx.params;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    opmeSupplierId: url.searchParams.get("opmeSupplierId") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }
  const { limit, opmeSupplierId } = parsed.data;

  const resolved = await resolvePublishedPathwayVersion(tenantCtx.tenantId, pathwayId);
  if (resolved.outcome === "PATHWAY_NOT_FOUND") {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }
  if (resolved.outcome === "NO_PUBLISHED_VERSION") {
    return jsonError("CONFLICT", apiT("errors.noPublishedVersion"), 409);
  }
  const { version } = resolved;

  const { tryAcquire } = await import("@/lib/api/distributed-lock");
  const slaThrottleKey = `sla-check:${pathwayId}:${version.id}`;
  const canRun = await tryAcquire(slaThrottleKey, 60);
  if (canRun) {
    void checkAndEmitSlaNotifications({
      tenantId: tenantCtx.tenantId,
      pathwayId,
      versionId: version.id,
    });
  }

  const now = new Date();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const clientWhere = await buildKanbanClientWhereForSession(
    auth.session!,
    tenantCtx.tenantId,
    "",
    opmeSupplierId,
  );

  const SCAN_LIMIT = 5_000;
  const raw = await prisma.patientPathway.findMany({
    where: {
      tenantId: tenantCtx.tenantId,
      pathwayId,
      pathwayVersionId: version.id,
      completedAt: null,
      client: clientWhere,
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      currentStage: {
        select: {
          id: true,
          name: true,
          alertWarningDays: true,
          alertCriticalDays: true,
        },
      },
    },
    take: SCAN_LIMIT,
  });

  const dangerOrdered = raw
    .map((pp) => {
      const slaStatus = computeSlaHealthStatus(
        pp.enteredStageAt,
        now,
        pp.currentStage.alertWarningDays,
        pp.currentStage.alertCriticalDays,
      );
      const daysInStage = Math.floor((now.getTime() - pp.enteredStageAt.getTime()) / MS_PER_DAY);
      return { pp, slaStatus, daysInStage };
    })
    .filter((x) => x.slaStatus === "danger")
    .sort((a, b) => b.daysInStage - a.daysInStage);

  const totalItems = dangerOrdered.length;
  const pageRows = dangerOrdered.slice(0, limit);

  return jsonSuccess({
    pathwayId,
    data: pageRows.map(({ pp, daysInStage }) => ({
      patientPathwayId: pp.id,
      clientId: pp.client.id,
      clientName: pp.client.name,
      daysInStage,
      stageName: pp.currentStage.name,
    })),
    pagination: buildPagination(1, limit, totalItems),
  });
}
