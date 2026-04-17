import type { IPatientPortalOtpRepository } from "@/application/ports/patient-portal-otp-repository.port";
import { prisma } from "@/infrastructure/database/prisma";

export class PatientPortalOtpPrismaRepository implements IPatientPortalOtpRepository {
  async countRecentChallenges(clientId: string, since: Date) {
    return prisma.patientPortalOtpChallenge.count({
      where: { clientId, createdAt: { gte: since } },
    });
  }

  async createChallenge(params: {
    clientId: string;
    tenantId: string;
    codeHash: string;
    expiresAt: Date;
  }) {
    await prisma.patientPortalOtpChallenge.create({
      data: {
        clientId: params.clientId,
        tenantId: params.tenantId,
        codeHash: params.codeHash,
        expiresAt: params.expiresAt,
      },
    });
  }

  async findLatestActiveChallenge(clientId: string, tenantId: string) {
    return prisma.patientPortalOtpChallenge.findFirst({
      where: {
        clientId,
        tenantId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, codeHash: true, attempts: true },
    });
  }

  async incrementChallengeAttempts(id: string) {
    await prisma.patientPortalOtpChallenge.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async markChallengeConsumed(id: string) {
    await prisma.patientPortalOtpChallenge.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }
}

export const patientPortalOtpPrismaRepository = new PatientPortalOtpPrismaRepository();
