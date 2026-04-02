import { prisma } from "@/infrastructure/database/prisma";
import { recordAuditEvent, AuditEventType } from "@/infrastructure/audit/record-audit-event";
import { notificationEmitter } from "@/infrastructure/notifications/notification-emitter";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { buildStageDispatchStub, getStageDocumentBundle } from "@/lib/pathway/stage-document-bundle";
import { resolvePathwayNotificationTargetUserIds } from "@/lib/notifications/resolve-pathway-notification-targets";
import { listPendingRequiredChecklistItems } from "@/lib/pathway/pending-required-checklist";
import { resolvePatientPathwayStageAssigneeUserId } from "@/lib/pathway/validate-stage-assignees";
import { postStageTransitionBodySchema } from "@/lib/validators/pathway";

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
  const actorUserId = auth.session!.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postStageTransitionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const pp = await prisma.patientPathway.findFirst({
    where: { id: patientPathwayId, tenantId: tenantCtx.tenantId },
    include: {
      client: { select: { id: true, name: true, assignedToUserId: true } },
      currentStage: { select: { id: true, name: true, stageKey: true } },
    },
  });
  if (!pp) {
    return jsonError("NOT_FOUND", apiT("errors.patientPathwayInstanceNotFound"), 404);
  }
  if (pp.completedAt) {
    return jsonError("CONFLICT", apiT("errors.pathwayAlreadyCompleted"), 409);
  }

  const toStage = await prisma.pathwayStage.findFirst({
    where: {
      id: parsed.data.toStageId,
      pathwayVersionId: pp.pathwayVersionId,
    },
  });
  if (!toStage) {
    return jsonError("NOT_FOUND", apiT("errors.invalidStageForVersion"), 404);
  }

  if (toStage.id === pp.currentStageId) {
    return jsonError("VALIDATION_ERROR", apiT("errors.patientAlreadyInStage"), 422);
  }

  const { tryAcquire, releaseLock } = await import("@/lib/api/distributed-lock");
  const lockKey = `lock:transition:${patientPathwayId}`;
  const acquired = await tryAcquire(lockKey, 10);
  if (!acquired) {
    return jsonError("CONFLICT", "Transition already in progress.", 409);
  }

  let updated;
  let blockedPending: { id: string; label: string }[] | null = null;
  try {
    const txResult = await prisma.$transaction(async (tx) => {
      const pendingRequired = await listPendingRequiredChecklistItems(
        tx,
        pp.id,
        pp.currentStageId,
      );

      if (pendingRequired.length > 0 && !parsed.data.force) {
        return { outcome: "blocked" as const, pending: pendingRequired };
      }

      const overrideReasonTrimmed =
        pendingRequired.length > 0 && parsed.data.force
          ? (parsed.data.overrideReason?.trim() ?? "")
          : null;

      const documents = await getStageDocumentBundle(tx, toStage.id);

      const currentStageAssigneeUserId = await resolvePatientPathwayStageAssigneeUserId(
        tx,
        tenantCtx.tenantId,
        {
          defaultAssigneeUserIds: toStage.defaultAssigneeUserIds,
          defaultAssigneeUserId: toStage.defaultAssigneeUserId,
        },
        pp.client.assignedToUserId,
      );

      const createdTransition = await tx.stageTransition.create({
        data: {
          patientPathwayId: pp.id,
          fromStageId: pp.currentStageId,
          toStageId: toStage.id,
          actorUserId,
          note: parsed.data.note?.trim() || null,
          ruleOverrideReason: overrideReasonTrimmed && overrideReasonTrimmed.length > 0 ? overrideReasonTrimmed : null,
          forcedByUserId:
            pendingRequired.length > 0 && parsed.data.force ? actorUserId : null,
          dispatchStub: buildStageDispatchStub({
            tenantId: tenantCtx.tenantId,
            clientId: pp.clientId,
            stageId: toStage.id,
            stageName: toStage.name,
            documents,
          }),
        },
        select: { id: true },
      });

      const forcedOverride = pendingRequired.length > 0 && Boolean(parsed.data.force);
      const auditOverrideReason =
        overrideReasonTrimmed && overrideReasonTrimmed.length > 0 ? overrideReasonTrimmed : null;
      await recordAuditEvent(tx, {
        tenantId: tenantCtx.tenantId,
        clientId: pp.clientId,
        patientPathwayId: pp.id,
        actorUserId,
        type: AuditEventType.STAGE_TRANSITION,
        payload: {
          transitionId: createdTransition.id,
          fromStageId: pp.currentStageId,
          toStageId: toStage.id,
          fromStageName: pp.currentStage?.name ?? null,
          toStageName: toStage.name,
          forcedOverride,
          ...(auditOverrideReason ? { ruleOverrideReason: auditOverrideReason } : {}),
        },
      });

      const nextPp = await tx.patientPathway.update({
        where: { id: pp.id },
        data: {
          currentStageId: toStage.id,
          enteredStageAt: new Date(),
          currentStageAssigneeUserId,
        },
        include: {
          currentStage: true,
          currentStageAssignee: { select: { id: true, name: true, email: true } },
        },
      });

      return { outcome: "ok" as const, patientPathway: nextPp };
    });

    if (txResult.outcome === "blocked") {
      blockedPending = txResult.pending;
    } else {
      updated = txResult.patientPathway;
    }
  } finally {
    await releaseLock(lockKey);
  }

  if (blockedPending) {
    return jsonError(
      "CHECKLIST_REQUIRED_INCOMPLETE",
      apiT("errors.checklistRequiredIncomplete"),
      422,
      { pendingItems: blockedPending },
    );
  }

  if (!updated) {
    return jsonError("INTERNAL", apiT("errors.dbUnavailable"), 500);
  }

  const stageTransitionTargets = await resolvePathwayNotificationTargetUserIds({
    tenantId: tenantCtx.tenantId,
    type: "stage_transition",
    currentStageAssigneeUserId: updated.currentStageAssigneeUserId,
  });

  notificationEmitter.emit({
    tenantId: tenantCtx.tenantId,
    type: "stage_transition",
    title: `${pp.client.name} avançou para ${toStage.name}`,
    targetUserIds: stageTransitionTargets,
    correlationId: `${pp.id}:${toStage.id}`,
    metadata: {
      clientId: pp.clientId,
      patientPathwayId: pp.id,
      fromStageId: pp.currentStageId,
      toStageId: toStage.id,
      stageName: toStage.name,
    },
  }).catch((err) => console.error("[notification] stage_transition emit failed:", err));

  return jsonSuccess({
    patientPathway: {
      id: updated.id,
      currentStage: updated.currentStage,
      currentStageAssignee: updated.currentStageAssignee
        ? {
            id: updated.currentStageAssignee.id,
            name: updated.currentStageAssignee.name,
            email: updated.currentStageAssignee.email,
          }
        : null,
      enteredStageAt: updated.enteredStageAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
