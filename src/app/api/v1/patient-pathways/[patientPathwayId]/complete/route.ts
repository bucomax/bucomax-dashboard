import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ patientPathwayId: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const { patientPathwayId } = await ctx.params;

  const pp = await prisma.patientPathway.findFirst({
    where: { id: patientPathwayId, tenantId: tenantCtx.tenantId },
    select: { id: true, completedAt: true },
  });
  if (!pp) {
    return jsonError("NOT_FOUND", apiT("errors.patientPathwayInstanceNotFound"), 404);
  }
  if (pp.completedAt) {
    return jsonError("CONFLICT", apiT("errors.pathwayAlreadyCompleted"), 409);
  }

  const updated = await prisma.patientPathway.update({
    where: { id: pp.id },
    data: { completedAt: new Date() },
    include: {
      client: { select: { id: true, name: true } },
      pathway: { select: { id: true, name: true } },
      currentStage: { select: { id: true, name: true } },
    },
  });

  return jsonSuccess({
    patientPathway: {
      id: updated.id,
      completedAt: updated.completedAt!.toISOString(),
      client: updated.client,
      pathway: updated.pathway,
      currentStage: updated.currentStage,
    },
  });
}
