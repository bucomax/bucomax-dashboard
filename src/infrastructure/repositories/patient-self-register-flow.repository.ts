import { Prisma } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma";

export async function runPatientSelfRegisterSerializableTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function findPatientSelfRegisterInviteForPreview(token: string) {
  return prisma.patientSelfRegisterInvite.findUnique({
    where: { token },
    include: {
      tenant: { select: { name: true, taxId: true, isActive: true } },
      client: {
        select: {
          name: true,
          phone: true,
          email: true,
          documentId: true,
          caseDescription: true,
          postalCode: true,
          addressLine: true,
          addressNumber: true,
          addressComp: true,
          neighborhood: true,
          city: true,
          state: true,
          isMinor: true,
          birthDate: true,
          guardianName: true,
          guardianDocumentId: true,
          guardianPhone: true,
          guardianEmail: true,
          guardianRelationship: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          preferredChannel: true,
          deletedAt: true,
        },
      },
    },
  });
}
