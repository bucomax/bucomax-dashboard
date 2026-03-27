import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { postPatientPathwayBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

function dispatchStub(input: {
  tenantId: string;
  clientId: string;
  stageId: string;
  stageName: string;
}) {
  return {
    event: "patient.stage_changed",
    ...input,
    documents: [] as string[],
    channel: "whatsapp_stub",
  };
}

export async function GET() {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const ctx = getActiveTenantIdOr400(auth.session!);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;

  const rows = await prisma.patientPathway.findMany({
    where: { tenantId },
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
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const ctx = getActiveTenantIdOr400(auth.session!);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const actorUserId = auth.session!.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
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
    return jsonError("NOT_FOUND", "Paciente não encontrado neste tenant.", 404);
  }

  const existing = await prisma.patientPathway.findUnique({
    where: { clientId },
    select: { id: true },
  });
  if (existing) {
    return jsonError("CONFLICT", "Este paciente já está em uma jornada.", 409);
  }

  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return jsonError("NOT_FOUND", "Jornada não encontrada.", 404);
  }

  const publishedVersion = await prisma.pathwayVersion.findFirst({
    where: { pathwayId, published: true },
    orderBy: { version: "desc" },
    include: {
      stages: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  if (!publishedVersion || publishedVersion.stages.length === 0) {
    return jsonError(
      "CONFLICT",
      "Não há versão publicada com etapas para esta jornada. Publique uma versão primeiro.",
      409,
    );
  }

  const firstStage = publishedVersion.stages[0]!;

  const result = await prisma.$transaction(async (tx) => {
    const pp = await tx.patientPathway.create({
      data: {
        tenantId,
        clientId,
        pathwayId,
        pathwayVersionId: publishedVersion.id,
        currentStageId: firstStage.id,
      },
      include: {
        currentStage: true,
        pathway: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, phone: true } },
      },
    });

    await tx.stageTransition.create({
      data: {
        patientPathwayId: pp.id,
        fromStageId: null,
        toStageId: firstStage.id,
        actorUserId,
        dispatchStub: dispatchStub({
          tenantId,
          clientId,
          stageId: firstStage.id,
          stageName: firstStage.name,
        }),
      },
    });

    return pp;
  });

  return jsonSuccess(
    {
      patientPathway: {
        id: result.id,
        client: result.client,
        pathway: result.pathway,
        currentStage: result.currentStage,
        createdAt: result.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
