import type { IDashboardHomeRepository } from "@/application/ports/dashboard-home-repository.port";
import { prisma } from "@/infrastructure/database/prisma";

export class DashboardHomePrismaRepository implements IDashboardHomeRepository {
  async fetchPathwayOptions(tenantId: string) {
    return prisma.carePathway.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        versions: {
          where: { published: true },
          orderBy: { version: "desc" },
          take: 1,
          select: { id: true, version: true },
        },
      },
    });
  }

  async countActivePathways(tenantId: string) {
    return prisma.patientPathway.count({
      where: { tenantId, completedAt: null },
    });
  }

  async countTransitionsSince(tenantId: string, since: Date) {
    return prisma.stageTransition.count({
      where: {
        createdAt: { gte: since },
        patientPathway: { tenantId },
      },
    });
  }

  async countAwaitingAction(tenantId: string, staleThreshold: Date) {
    return prisma.patientPathway.count({
      where: {
        tenantId,
        completedAt: null,
        updatedAt: { lte: staleThreshold },
      },
    });
  }

  async countCompletedSince(tenantId: string, since: Date) {
    return prisma.patientPathway.count({
      where: {
        tenantId,
        completedAt: { gte: since },
      },
    });
  }

  async findTransitionsSince(tenantId: string, since: Date) {
    return prisma.stageTransition.findMany({
      where: {
        createdAt: { gte: since },
        patientPathway: { tenantId },
      },
      select: { patientPathwayId: true, createdAt: true },
    });
  }

  async findCompletionTimestampsSince(tenantId: string, since: Date) {
    return prisma.patientPathway.findMany({
      where: {
        tenantId,
        completedAt: { gte: since },
      },
      select: { completedAt: true },
    });
  }

  async findStartTimestampsSince(tenantId: string, since: Date) {
    return prisma.patientPathway.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
      },
      select: { createdAt: true },
    });
  }
}

export const dashboardHomePrismaRepository = new DashboardHomePrismaRepository();
