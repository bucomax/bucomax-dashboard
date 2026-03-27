import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { postStageTransitionBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ patientPathwayId: string }> };

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

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const t = getActiveTenantIdOr400(auth.session!);
  if (t.response) return t.response;

  const { patientPathwayId } = await ctx.params;
  const actorUserId = auth.session!.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = postStageTransitionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const pp = await prisma.patientPathway.findFirst({
    where: { id: patientPathwayId, tenantId: t.tenantId },
    include: { client: { select: { id: true } } },
  });
  if (!pp) {
    return jsonError("NOT_FOUND", "Instância de jornada não encontrada.", 404);
  }

  const toStage = await prisma.pathwayStage.findFirst({
    where: {
      id: parsed.data.toStageId,
      pathwayVersionId: pp.pathwayVersionId,
    },
  });
  if (!toStage) {
    return jsonError("NOT_FOUND", "Etapa inválida para esta versão da jornada.", 404);
  }

  if (toStage.id === pp.currentStageId) {
    return jsonError("VALIDATION_ERROR", "O paciente já está nesta etapa.", 422);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.stageTransition.create({
      data: {
        patientPathwayId: pp.id,
        fromStageId: pp.currentStageId,
        toStageId: toStage.id,
        actorUserId,
        note: parsed.data.note?.trim() || null,
        dispatchStub: dispatchStub({
          tenantId: t.tenantId,
          clientId: pp.clientId,
          stageId: toStage.id,
          stageName: toStage.name,
        }),
      },
    });

    return tx.patientPathway.update({
      where: { id: pp.id },
      data: { currentStageId: toStage.id },
      include: { currentStage: true },
    });
  });

  return jsonSuccess({
    patientPathway: {
      id: updated.id,
      currentStage: updated.currentStage,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
