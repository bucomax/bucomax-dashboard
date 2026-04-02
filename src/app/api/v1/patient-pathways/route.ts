import { prisma } from "@/infrastructure/database/prisma";
import { notificationEmitter } from "@/infrastructure/notifications/notification-emitter";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  findTenantClientVisibleToSession,
  loadTenantMembershipClientScope,
  mergeClientWhereWithVisibility,
} from "@/lib/auth/client-visibility";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { buildStageDispatchStub, getStageDocumentBundle } from "@/lib/pathway/stage-document-bundle";
import { resolvePathwayNotificationTargetUserIds } from "@/lib/notifications/resolve-pathway-notification-targets";
import { resolvePatientPathwayStageAssigneeUserId } from "@/lib/pathway/validate-stage-assignees";
import { postPatientPathwayBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  const scope = await loadTenantMembershipClientScope(
    auth.session!.user.id,
    tenantId,
    auth.session!.user.globalRole,
  );
  const clientVisibilityWhere = mergeClientWhereWithVisibility(
    { deletedAt: null },
    scope,
    auth.session!.user.id,
  );

  const rows = await prisma.patientPathway.findMany({
    where: {
      tenantId,
      completedAt: null,
      client: { is: clientVisibilityWhere },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      pathway: { select: { id: true, name: true } },
      currentStage: { select: { id: true, name: true, stageKey: true } },
      currentStageAssignee: { select: { id: true, name: true, email: true } },
    },
    take: 200,
  });

  return jsonSuccess({
    patientPathways: rows.map((r) => ({
      id: r.id,
      client: r.client,
      pathway: r.pathway,
      currentStage: r.currentStage,
      currentStageAssignee: r.currentStageAssignee
        ? {
            id: r.currentStageAssignee.id,
            name: r.currentStageAssignee.name,
            email: r.currentStageAssignee.email,
          }
        : null,
      enteredStageAt: r.enteredStageAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;
  const actorUserId = auth.session!.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPatientPathwayBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { clientId, pathwayId } = parsed.data;

  const client = await findTenantClientVisibleToSession(auth.session!, tenantId, clientId, {
    id: true,
    assignedToUserId: true,
  });
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFoundInTenant"), 404);
  }

  const activePathway = await prisma.patientPathway.findFirst({
    where: { clientId, completedAt: null },
    select: { id: true },
  });
  if (activePathway) {
    return jsonError("CONFLICT", apiT("errors.patientAlreadyInJourney"), 409);
  }

  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }

  const publishedVersion = await prisma.pathwayVersion.findFirst({
    where: { pathwayId, published: true },
    orderBy: { version: "desc" },
    include: {
      stages: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  if (!publishedVersion || publishedVersion.stages.length === 0) {
    return jsonError("CONFLICT", apiT("errors.noPublishedVersionWithStages"), 409);
  }

  const firstStage = publishedVersion.stages[0]!;

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const currentStageAssigneeUserId = await resolvePatientPathwayStageAssigneeUserId(
      tx,
      tenantId,
      {
        defaultAssigneeUserIds: firstStage.defaultAssigneeUserIds,
        defaultAssigneeUserId: firstStage.defaultAssigneeUserId,
      },
      client.assignedToUserId,
    );
    const pp = await tx.patientPathway.create({
      data: {
        tenantId,
        clientId,
        pathwayId,
        pathwayVersionId: publishedVersion.id,
        currentStageId: firstStage.id,
        enteredStageAt: now,
        currentStageAssigneeUserId,
      },
      include: {
        currentStage: true,
        pathway: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, phone: true } },
        currentStageAssignee: { select: { id: true, name: true, email: true } },
      },
    });
    const documents = await getStageDocumentBundle(tx, firstStage.id);

    await tx.stageTransition.create({
      data: {
        patientPathwayId: pp.id,
        fromStageId: null,
        toStageId: firstStage.id,
        actorUserId,
        dispatchStub: buildStageDispatchStub({
          tenantId,
          clientId,
          stageId: firstStage.id,
          stageName: firstStage.name,
          documents,
        }),
      },
    });

    return pp;
  });

  const newPatientTargets = await resolvePathwayNotificationTargetUserIds({
    tenantId,
    type: "new_patient",
    currentStageAssigneeUserId: result.currentStageAssigneeUserId,
  });

  notificationEmitter.emit({
    tenantId,
    type: "new_patient",
    title: `Novo paciente: ${result.client.name}`,
    body: `Jornada "${result.pathway.name}" iniciada na etapa ${result.currentStage.name}.`,
    targetUserIds: newPatientTargets,
    correlationId: result.id,
    metadata: {
      clientId: result.clientId,
      patientPathwayId: result.id,
      pathwayName: result.pathway.name,
      stageName: result.currentStage.name,
    },
  }).catch((err) => console.error("[notification] new_patient emit failed:", err));

  return jsonSuccess(
    {
      patientPathway: {
        id: result.id,
        client: result.client,
        pathway: result.pathway,
        currentStage: result.currentStage,
        currentStageAssignee: result.currentStageAssignee
          ? {
              id: result.currentStageAssignee.id,
              name: result.currentStageAssignee.name,
              email: result.currentStageAssignee.email,
            }
          : null,
        enteredStageAt: result.enteredStageAt.toISOString(),
        createdAt: result.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
