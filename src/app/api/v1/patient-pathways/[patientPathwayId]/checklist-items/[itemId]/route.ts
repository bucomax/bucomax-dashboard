import { prisma } from "@/infrastructure/database/prisma";
import { notificationEmitter } from "@/infrastructure/notifications/notification-emitter";
import { resolvePathwayNotificationTargetUserIds } from "@/lib/notifications/resolve-pathway-notification-targets";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { patchPatientChecklistItemBodySchema } from "@/lib/validators/patient-pathway-checklist";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ patientPathwayId: string; itemId: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patchPatientChecklistItemBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { patientPathwayId, itemId } = await ctx.params;

  const patientPathway = await prisma.patientPathway.findFirst({
    where: { id: patientPathwayId, tenantId: tenantCtx.tenantId },
    select: { id: true, currentStageId: true, pathwayVersionId: true },
  });
  if (!patientPathway) {
    return jsonError("NOT_FOUND", apiT("errors.patientPathwayNotFound"), 404);
  }

  const checklistItem = await prisma.pathwayStageChecklistItem.findFirst({
    where: {
      id: itemId,
      pathwayStage: {
        pathwayVersionId: patientPathway.pathwayVersionId,
      },
    },
    select: { id: true, pathwayStageId: true },
  });
  if (!checklistItem) {
    return jsonError("NOT_FOUND", apiT("errors.checklistItemNotFound"), 404);
  }

  if (checklistItem.pathwayStageId !== patientPathway.currentStageId) {
    return jsonError("VALIDATION_ERROR", apiT("errors.checklistOnlyCurrentStage"), 422);
  }

  const completedAt = parsed.data.completed ? new Date() : null;
  const completedByUserId = parsed.data.completed ? auth.session!.user.id : null;

  const progress = await prisma.patientPathwayChecklistItem.upsert({
    where: {
      patientPathwayId_checklistItemId: {
        patientPathwayId: patientPathway.id,
        checklistItemId: checklistItem.id,
      },
    },
    update: {
      completedAt,
      completedByUserId,
    },
    create: {
      patientPathwayId: patientPathway.id,
      checklistItemId: checklistItem.id,
      completedAt,
      completedByUserId,
    },
    select: {
      checklistItemId: true,
      completedAt: true,
    },
  });

  if (parsed.data.completed) {
    const totalItems = await prisma.pathwayStageChecklistItem.count({
      where: { pathwayStageId: patientPathway.currentStageId },
    });
    const completedItems = await prisma.patientPathwayChecklistItem.count({
      where: {
        patientPathwayId: patientPathway.id,
        checklistItem: { pathwayStageId: patientPathway.currentStageId },
        completedAt: { not: null },
      },
    });

    if (totalItems > 0 && completedItems >= totalItems) {
      const pp = await prisma.patientPathway.findUnique({
        where: { id: patientPathway.id },
        select: {
          tenantId: true,
          clientId: true,
          currentStageAssigneeUserId: true,
          client: { select: { name: true } },
          currentStage: { select: { name: true } },
        },
      });
      if (pp) {
        const checklistTargets = await resolvePathwayNotificationTargetUserIds({
          tenantId: tenantCtx.tenantId,
          type: "checklist_complete",
          currentStageAssigneeUserId: pp.currentStageAssigneeUserId,
        });
        notificationEmitter.emit({
          tenantId: tenantCtx.tenantId,
          type: "checklist_complete",
          title: `Checklist completo: ${pp.client.name}`,
          body: `Todos os itens da etapa "${pp.currentStage.name}" foram concluídos.`,
          targetUserIds: checklistTargets,
          correlationId: `${patientPathway.id}:${patientPathway.currentStageId}`,
          metadata: {
            clientId: pp.clientId,
            patientPathwayId: patientPathway.id,
            stageName: pp.currentStage.name,
          },
        }).catch((err) => console.error("[notification] checklist_complete emit failed:", err));
      }
    }
  }

  return jsonSuccess({
    item: {
      checklistItemId: progress.checklistItemId,
      completed: progress.completedAt != null,
      completedAt: progress.completedAt?.toISOString() ?? null,
    },
  });
}
