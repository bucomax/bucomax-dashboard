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

  const row = await prisma.patientPathway.findFirst({
    where: { id: patientPathwayId, tenantId: tenantCtx.tenantId },
    include: {
      client: { select: { id: true, name: true, phone: true, caseDescription: true } },
      pathway: { select: { id: true, name: true, description: true } },
      pathwayVersion: {
        select: {
          id: true,
          version: true,
          stages: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              stageKey: true,
              sortOrder: true,
              alertWarningDays: true,
              alertCriticalDays: true,
              defaultAssigneeUserId: true,
            },
          },
        },
      },
      currentStage: true,
      currentStageAssignee: { select: { id: true, name: true, email: true } },
      transitions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          fromStage: { select: { id: true, name: true, stageKey: true } },
          toStage: { select: { id: true, name: true, stageKey: true } },
          actor: { select: { id: true, name: true, email: true } },
          forcedByUser: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!row) {
    return jsonError("NOT_FOUND", apiT("errors.patientPathwayInstanceNotFound"), 404);
  }

  const [checklistTemplate, checklistProgress] = await Promise.all([
    prisma.pathwayStageChecklistItem.findMany({
      where: { pathwayStageId: row.currentStageId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, requiredForTransition: true },
    }),
    prisma.patientPathwayChecklistItem.findMany({
      where: { patientPathwayId: row.id },
      select: { checklistItemId: true, completedAt: true },
    }),
  ]);
  const completedAtByItemId = new Map(
    checklistProgress.map((p) => [p.checklistItemId, p.completedAt]),
  );
  const currentStageChecklist = checklistTemplate.map((ci) => {
    const completedAt = completedAtByItemId.get(ci.id) ?? null;
    return {
      id: ci.id,
      label: ci.label,
      requiredForTransition: ci.requiredForTransition,
      completed: completedAt != null,
      completedAt: completedAt?.toISOString() ?? null,
    };
  });

  return jsonSuccess({
    patientPathway: {
      id: row.id,
      client: row.client,
      pathway: row.pathway,
      pathwayVersion: row.pathwayVersion,
      currentStage: row.currentStage,
      currentStageAssignee: row.currentStageAssignee
        ? {
            id: row.currentStageAssignee.id,
            name: row.currentStageAssignee.name,
            email: row.currentStageAssignee.email,
          }
        : null,
      currentStageChecklist,
      transitions: row.transitions.map((tr) => ({
        id: tr.id,
        fromStage: tr.fromStage,
        toStage: tr.toStage,
        note: tr.note,
        ruleOverrideReason: tr.ruleOverrideReason,
        forcedBy: tr.forcedByUser
          ? {
              id: tr.forcedByUser.id,
              name: tr.forcedByUser.name,
              email: tr.forcedByUser.email,
            }
          : null,
        actor: {
          id: tr.actor.id,
          name: tr.actor.name,
          email: tr.actor.email,
        },
        dispatchStub: tr.dispatchStub,
        createdAt: tr.createdAt.toISOString(),
      })),
      enteredStageAt: row.enteredStageAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
