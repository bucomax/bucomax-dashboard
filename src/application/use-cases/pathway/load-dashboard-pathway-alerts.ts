import type { Prisma } from "@prisma/client";
import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";
import { buildPagination } from "@/lib/api/pagination";
import type { PublishedPathwayVersionWithStages } from "@/infrastructure/database/pathway-published";
import { computeSlaHealthStatus } from "@/domain/pathway/sla-health";

const SCAN_LIMIT = 5_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const patientAlertsInclude = {
  client: { select: { id: true, name: true, phone: true } },
  currentStage: {
    select: {
      id: true,
      name: true,
      alertWarningDays: true,
      alertCriticalDays: true,
    },
  },
} satisfies Prisma.PatientPathwayInclude;

type AlertRow = Prisma.PatientPathwayGetPayload<{ include: typeof patientAlertsInclude }>;

export async function loadDashboardPathwayAlerts(params: {
  tenantId: string;
  pathwayId: string;
  version: PublishedPathwayVersionWithStages;
  clientWhere: Prisma.ClientWhereInput;
  limit: number;
}) {
  const { tenantId, pathwayId, version, clientWhere, limit } = params;
  const now = new Date();

  const raw = (await patientPathwayPrismaRepository.findManyPatientPathwaysQuery({
    where: {
      tenantId,
      pathwayId,
      pathwayVersionId: version.id,
      completedAt: null,
      client: clientWhere,
    },
    include: patientAlertsInclude,
    take: SCAN_LIMIT,
  })) as AlertRow[];

  const dangerOrdered = raw
    .map((pp) => {
      const slaStatus = computeSlaHealthStatus(
        pp.enteredStageAt,
        now,
        pp.currentStage.alertWarningDays,
        pp.currentStage.alertCriticalDays,
      );
      const daysInStage = Math.floor((now.getTime() - pp.enteredStageAt.getTime()) / MS_PER_DAY);
      return { pp, slaStatus, daysInStage };
    })
    .filter((x) => x.slaStatus === "danger")
    .sort((a, b) => b.daysInStage - a.daysInStage);

  const totalItems = dangerOrdered.length;
  const pageRows = dangerOrdered.slice(0, limit);

  return {
    data: pageRows.map(({ pp, daysInStage }) => ({
      patientPathwayId: pp.id,
      clientId: pp.client.id,
      clientName: pp.client.name,
      daysInStage,
      stageName: pp.currentStage.name,
    })),
    pagination: buildPagination(1, limit, totalItems),
  };
}
