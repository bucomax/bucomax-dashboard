import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ patientPathwayId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const t = getActiveTenantIdOr400(auth.session!);
  if (t.response) return t.response;

  const { patientPathwayId } = await ctx.params;

  const row = await prisma.patientPathway.findFirst({
    where: { id: patientPathwayId, tenantId: t.tenantId },
    include: {
      client: { select: { id: true, name: true, phone: true, caseDescription: true } },
      pathway: { select: { id: true, name: true, description: true } },
      pathwayVersion: { select: { id: true, version: true } },
      currentStage: true,
      transitions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          fromStage: { select: { id: true, name: true, stageKey: true } },
          toStage: { select: { id: true, name: true, stageKey: true } },
        },
      },
    },
  });

  if (!row) {
    return jsonError("NOT_FOUND", "Instância de jornada não encontrada.", 404);
  }

  return jsonSuccess({
    patientPathway: {
      id: row.id,
      client: row.client,
      pathway: row.pathway,
      pathwayVersion: row.pathwayVersion,
      currentStage: row.currentStage,
      transitions: row.transitions.map((tr) => ({
        id: tr.id,
        fromStage: tr.fromStage,
        toStage: tr.toStage,
        note: tr.note,
        dispatchStub: tr.dispatchStub,
        createdAt: tr.createdAt.toISOString(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
