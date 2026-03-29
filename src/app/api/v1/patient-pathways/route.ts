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

  const rows = await prisma.patientPathway.findMany({
    where: { tenantId, completedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      pathway: { select: { id: true, name: true } },
      currentStage: { select: { id: true, name: true, stageKey: true } },
    },
    take: 200,
  });

  return jsonSuccess({
    patientPathways: rows.map((r) => ({
      id: r.id,
      client: r.client,
      pathway: r.pathway,
      currentStage: r.currentStage,
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

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId, deletedAt: null },
    select: { id: true },
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
    const pp = await tx.patientPathway.create({
      data: {
        tenantId,
        clientId,
        pathwayId,
        pathwayVersionId: publishedVersion.id,
        currentStageId: firstStage.id,
        enteredStageAt: now,
      },
      include: {
        currentStage: true,
        pathway: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, phone: true } },
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

  notificationEmitter.emit({
    tenantId,
    type: "new_patient",
    title: `Novo paciente: ${result.client.name}`,
    body: `Jornada "${result.pathway.name}" iniciada na etapa ${result.currentStage.name}.`,
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
        enteredStageAt: result.enteredStageAt.toISOString(),
        createdAt: result.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
