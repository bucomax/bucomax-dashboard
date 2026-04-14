import type { Prisma, PrismaClient } from "@prisma/client";
import { AuditEventType } from "@prisma/client";

export type RecordAuditEventInput = {
  tenantId: string;
  /** Opcional para eventos só de tenant/equipe (ex.: login staff). */
  clientId?: string | null;
  patientPathwayId?: string | null;
  actorUserId?: string | null;
  type: AuditEventType;
  payload: Prisma.InputJsonValue;
};

type Db = Prisma.TransactionClient | PrismaClient;

export async function recordAuditEvent(db: Db, input: RecordAuditEventInput): Promise<void> {
  await db.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      clientId: input.clientId ?? null,
      patientPathwayId: input.patientPathwayId ?? null,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      payload: input.payload,
    },
  });
}

export { AuditEventType };
