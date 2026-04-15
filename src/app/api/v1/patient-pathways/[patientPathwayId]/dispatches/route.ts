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

export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const { patientPathwayId } = await ctx.params;

  // Verify the pathway belongs to this tenant
  const pp = await prisma.patientPathway.findFirst({
    where: { id: patientPathwayId, tenantId: tenantCtx.tenantId },
    select: { id: true },
  });
  if (!pp) {
    return jsonError("NOT_FOUND", apiT("errors.patientPathwayInstanceNotFound"), 404);
  }

  const dispatches = await prisma.channelDispatch.findMany({
    where: {
      stageTransition: { patientPathwayId },
      tenantId: tenantCtx.tenantId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      stageTransitionId: true,
      channel: true,
      status: true,
      externalMessageId: true,
      recipientPhone: true,
      documentFileName: true,
      errorDetail: true,
      sentAt: true,
      deliveredAt: true,
      readAt: true,
      confirmedAt: true,
      confirmationPayload: true,
      createdAt: true,
    },
  });

  return jsonSuccess({ dispatches });
}
