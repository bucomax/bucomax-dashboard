import { prisma } from "@/infrastructure/database/prisma";

const SCAN_LIMIT = 5_000;

export class PathwaySummaryReportPrismaRepository {
  async fetchScanData(input: {
    tenantId: string;
    periodStart: Date;
    pathwayId?: string;
    opmeSupplierId?: string;
  }) {
    const { tenantId, periodStart, pathwayId, opmeSupplierId } = input;

    const patientPathwayWhere = {
      tenantId,
      createdAt: { gte: periodStart },
      ...(pathwayId ? { pathwayId } : {}),
      client: {
        deletedAt: null,
        ...(opmeSupplierId ? { opmeSupplierId } : {}),
      },
    };

    const [rows, transitionsInPeriod] = await Promise.all([
      prisma.patientPathway.findMany({
        where: patientPathwayWhere,
        take: SCAN_LIMIT,
        select: {
          id: true,
          enteredStageAt: true,
          pathway: {
            select: {
              id: true,
              name: true,
            },
          },
          currentStage: {
            select: {
              id: true,
              name: true,
              sortOrder: true,
              alertWarningDays: true,
              alertCriticalDays: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              opmeSupplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.stageTransition.count({
        where: {
          createdAt: { gte: periodStart },
          patientPathway: {
            tenantId,
            ...(pathwayId ? { pathwayId } : {}),
            client: {
              deletedAt: null,
              ...(opmeSupplierId ? { opmeSupplierId } : {}),
            },
          },
        },
      }),
    ]);

    return { rows, transitionsInPeriod };
  }
}

export const pathwaySummaryReportPrismaRepository = new PathwaySummaryReportPrismaRepository();
