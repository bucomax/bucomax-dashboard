import type { Prisma } from "@prisma/client";
import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";
import { buildPagination } from "@/lib/api/pagination";
import type { PublishedPathwayVersionWithStages } from "@/infrastructure/database/pathway-published";
import { computeSlaHealthStatus } from "@/domain/pathway/sla-health";

const patientInclude = {
  client: { select: { id: true, name: true, phone: true } },
  currentStage: {
    select: {
      id: true,
      stageKey: true,
      name: true,
      sortOrder: true,
      alertWarningDays: true,
      alertCriticalDays: true,
    },
  },
  currentStageAssignee: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PatientPathwayInclude;

export async function loadKanbanColumnPatientsPage(params: {
  tenantId: string;
  pathwayId: string;
  stageId: string;
  version: PublishedPathwayVersionWithStages;
  clientWhere: Prisma.ClientWhereInput;
  page: number;
  limit: number;
}) {
  const { tenantId, pathwayId, stageId, version, clientWhere, page, limit } = params;
  const offset = (page - 1) * limit;
  const now = new Date();

  const stage = version.stages.find((s) => s.id === stageId);
  if (!stage) {
    return { ok: false as const, code: "STAGE_NOT_IN_VERSION" as const };
  }

  const listWhere: Prisma.PatientPathwayWhereInput = {
    tenantId,
    pathwayId,
    pathwayVersionId: version.id,
    currentStageId: stageId,
    completedAt: null,
    client: clientWhere,
  };

  const [totalItems, raw] = await Promise.all([
    patientPathwayPrismaRepository.countPatientPathwaysWhere(listWhere),
    patientPathwayPrismaRepository.findManyPatientPathwaysQuery({
      where: listWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
      include: patientInclude,
    }),
  ]);

  type Row = Prisma.PatientPathwayGetPayload<{ include: typeof patientInclude }>;

  return {
    ok: true as const,
    data: (raw as Row[]).map((pp) => ({
      id: pp.id,
      enteredStageAt: pp.enteredStageAt.toISOString(),
      slaStatus: computeSlaHealthStatus(
        pp.enteredStageAt,
        now,
        pp.currentStage.alertWarningDays,
        pp.currentStage.alertCriticalDays,
      ),
      client: pp.client,
      currentStage: pp.currentStage,
      currentStageAssignee: pp.currentStageAssignee
        ? {
            id: pp.currentStageAssignee.id,
            name: pp.currentStageAssignee.name,
            email: pp.currentStageAssignee.email,
          }
        : null,
      updatedAt: pp.updatedAt.toISOString(),
    })),
    pagination: buildPagination(page, limit, totalItems),
  };
}
