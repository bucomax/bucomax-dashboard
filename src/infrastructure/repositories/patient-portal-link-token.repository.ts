import type {
  IPatientPortalLinkTokenRepository,
  PatientPortalLinkTokenMagicLinkRow,
} from "@/application/ports/patient-portal-link-token-repository.port";
import { prisma } from "@/infrastructure/database/prisma";

export class PatientPortalLinkTokenPrismaRepository implements IPatientPortalLinkTokenRepository {
  async findByTokenForMagicLinkExchange(token: string): Promise<PatientPortalLinkTokenMagicLinkRow | null> {
    const row = await prisma.patientPortalLinkToken.findUnique({
      where: { token },
      include: {
        client: {
          select: {
            id: true,
            tenantId: true,
            deletedAt: true,
            portalPasswordChangedAt: true,
          },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      clientId: row.clientId,
      expiresAt: row.expiresAt,
      singleUse: row.singleUse,
      usedAt: row.usedAt,
      client: row.client,
    };
  }

  async markSingleUseConsumed(id: string, usedAt: Date) {
    await prisma.patientPortalLinkToken.update({
      where: { id },
      data: { usedAt },
    });
  }

  async createPortalLinkToken(params: {
    clientId: string;
    token: string;
    expiresAt: Date;
    singleUse: boolean;
  }) {
    const row = await prisma.patientPortalLinkToken.create({
      data: {
        clientId: params.clientId,
        token: params.token,
        expiresAt: params.expiresAt,
        singleUse: params.singleUse,
      },
      select: { id: true },
    });
    return row;
  }
}

export const patientPortalLinkTokenPrismaRepository = new PatientPortalLinkTokenPrismaRepository();
