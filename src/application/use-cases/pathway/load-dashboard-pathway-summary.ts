import type { Prisma } from "@prisma/client";
import { patientPathwayPrismaRepository } from "@/infrastructure/repositories/patient-pathway.repository";
import type { PublishedPathwayVersionWithStages } from "@/infrastructure/database/pathway-published";
import { computeSlaHealthStatus } from "@/domain/pathway/sla-health";

const SCAN_LIMIT = 5_000;

export async function loadDashboardPathwaySummary(params: {
  tenantId: string;
  pathwayId: string;
  version: PublishedPathwayVersionWithStages;
  clientWhere: Prisma.ClientWhereInput;
}) {
  const { tenantId, pathwayId, version, clientWhere } = params;
  const now = new Date();

  const rows = (await patientPathwayPrismaRepository.findManyPatientPathwaysQuery({
    where: {
      tenantId,
      pathwayId,
      pathwayVersionId: version.id,
      completedAt: null,
      client: clientWhere,
    },
    select: {
      enteredStageAt: true,
      currentStage: {
        select: { alertWarningDays: true, alertCriticalDays: true },
      },
    },
    take: SCAN_LIMIT,
  })) as unknown as Array<{
    enteredStageAt: Date;
    currentStage: { alertWarningDays: number; alertCriticalDays: number };
  }>;

  let ok = 0;
  let warning = 0;
  let danger = 0;
  for (const r of rows) {
    const s = computeSlaHealthStatus(
      r.enteredStageAt,
      now,
      r.currentStage.alertWarningDays,
      r.currentStage.alertCriticalDays,
    );
    if (s === "ok") ok += 1;
    else if (s === "warning") warning += 1;
    else danger += 1;
  }

  return {
    totals: {
      total: rows.length,
      ok,
      warning,
      danger,
    },
    versionMeta: {
      id: version.id,
      version: version.version,
    },
  };
}
