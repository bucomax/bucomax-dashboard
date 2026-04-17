import type { Prisma } from "@prisma/client";
import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";
import { buildPagination } from "@/lib/api/pagination";
import type { PublishedPathwayVersionWithStages } from "@/infrastructure/database/pathway-published";
import { computeSlaHealthStatus } from "@/domain/pathway/sla-health";
import type { KanbanQuery } from "@/lib/validators/kanban";

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

type PatientRow = Prisma.PatientPathwayGetPayload<{ include: typeof patientInclude }>;

function mapPatientRow(
  pp: PatientRow,
  slaStatus: ReturnType<typeof computeSlaHealthStatus>,
) {
  return {
    id: pp.id,
    enteredStageAt: pp.enteredStageAt.toISOString(),
    slaStatus,
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
  };
}

const statusFetchCap = 500;

export async function loadKanbanBoard(params: {
  tenantId: string;
  pathwayId: string;
  version: PublishedPathwayVersionWithStages;
  clientWhere: Prisma.ClientWhereInput;
  search: string;
  statusFilter: KanbanQuery["status"];
  limit: number;
  opmeSupplierId: string | null | undefined;
}) {
  const { tenantId, pathwayId, version, clientWhere, statusFilter, limit } = params;
  const now = new Date();

  const baseWhere: Prisma.PatientPathwayWhereInput = {
    tenantId,
    pathwayId,
    pathwayVersionId: version.id,
    completedAt: null,
    client: clientWhere,
  };

  const columns = await Promise.all(
    version.stages.map(async (stage) => {
      const where: Prisma.PatientPathwayWhereInput = {
        ...baseWhere,
        currentStageId: stage.id,
      };

      const stageDto = {
        id: stage.id,
        stageKey: stage.stageKey,
        name: stage.name,
        sortOrder: stage.sortOrder,
        patientMessage: stage.patientMessage,
        alertWarningDays: stage.alertWarningDays,
        alertCriticalDays: stage.alertCriticalDays,
      };

      if (!statusFilter) {
        const [totalItems, raw] = await Promise.all([
          patientPathwayPrismaRepository.countPatientPathwaysWhere(where),
          patientPathwayPrismaRepository.findManyPatientPathwaysQuery({
            where,
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: limit,
            include: patientInclude,
          }),
        ]);

        const data = (raw as PatientRow[]).map((pp) => {
          const slaStatus = computeSlaHealthStatus(
            pp.enteredStageAt,
            now,
            pp.currentStage.alertWarningDays,
            pp.currentStage.alertCriticalDays,
          );
          return mapPatientRow(pp, slaStatus);
        });

        return {
          stage: stageDto,
          data,
          pagination: buildPagination(1, limit, totalItems),
        };
      }

      const raw = await patientPathwayPrismaRepository.findManyPatientPathwaysQuery({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: statusFetchCap,
        include: patientInclude,
      });

      const withStatus = (raw as PatientRow[]).map((pp) => {
        const slaStatus = computeSlaHealthStatus(
          pp.enteredStageAt,
          now,
          pp.currentStage.alertWarningDays,
          pp.currentStage.alertCriticalDays,
        );
        return { row: pp, slaStatus };
      });

      const filtered = withStatus.filter((x) => x.slaStatus === statusFilter);
      const sliced = filtered.slice(0, limit);
      const totalItems = filtered.length;
      const paginationBase = buildPagination(1, limit, totalItems);
      const pagination =
        raw.length === statusFetchCap ? { ...paginationBase, hasNextPage: true } : paginationBase;

      return {
        stage: stageDto,
        data: sliced.map(({ row: pp, slaStatus }) => mapPatientRow(pp, slaStatus)),
        pagination,
      };
    }),
  );

  return {
    columns,
    query: {
      search: params.search || undefined,
      status: statusFilter,
      limit,
      opmeSupplierId: params.opmeSupplierId,
    },
  };
}
