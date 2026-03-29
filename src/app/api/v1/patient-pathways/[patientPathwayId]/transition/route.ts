import { prisma } from "@/infrastructure/database/prisma";
import { notificationEmitter } from "@/infrastructure/notifications/notification-emitter";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { buildStageDispatchStub, getStageDocumentBundle } from "@/lib/pathway/stage-document-bundle";
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
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const pp = await prisma.patientPathway.findFirst({
    where: { id: patientPathwayId, tenantId: tenantCtx.tenantId },
    include: { client: { select: { id: true, name: true } } },
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
  try {
    updated = await prisma.$transaction(async (tx) => {
      const documents = await getStageDocumentBundle(tx, toStage.id);

      await tx.stageTransition.create({
        data: {
          patientPathwayId: pp.id,
          fromStageId: pp.currentStageId,
          toStageId: toStage.id,
          actorUserId,
          note: parsed.data.note?.trim() || null,
          dispatchStub: buildStageDispatchStub({
            tenantId: tenantCtx.tenantId,
            clientId: pp.clientId,
            stageId: toStage.id,
            stageName: toStage.name,
            documents,
          }),
        },
      });

      return tx.patientPathway.update({
        where: { id: pp.id },
        data: {
          currentStageId: toStage.id,
          enteredStageAt: new Date(),
        },
        include: { currentStage: true },
      });
    });
  } finally {
    await releaseLock(lockKey);
  }

  notificationEmitter.emit({
    tenantId: tenantCtx.tenantId,
    type: "stage_transition",
    title: `${pp.client.name} avançou para ${toStage.name}`,
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
      enteredStageAt: updated.enteredStageAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
