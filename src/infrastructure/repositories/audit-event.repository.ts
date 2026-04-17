import { AuditEventType, type Prisma } from "@prisma/client";

import type {
  FindAuditEventsFilters,
  IAuditEventRepository,
  RecordAuditEventCanonicalInput,
  RecordAuditEventInput,
} from "@/application/ports/audit-event-repository.port";
import { prisma } from "@/infrastructure/database/prisma";

function parseAuditEventType(raw: string): AuditEventType {
  if (!Object.values(AuditEventType).includes(raw as AuditEventType)) {
    throw new Error(`Invalid AuditEventType: ${raw}`);
  }
  return raw as AuditEventType;
}

export class AuditEventPrismaRepository implements IAuditEventRepository {
  async recordCanonical(input: RecordAuditEventCanonicalInput) {
    const type = parseAuditEventType(input.eventType);
    const payload = input.payload as Prisma.InputJsonValue;
    await prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        clientId: input.clientId ?? null,
        patientPathwayId: input.patientPathwayId ?? null,
        actorUserId: input.actorUserId ?? null,
        type,
        payload,
      },
    });
  }

  async record(input: RecordAuditEventInput) {
    const type = parseAuditEventType(input.eventType);
    const payload: Prisma.InputJsonValue = {
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.metadata ?? {}),
      ...(input.payload ?? {}),
    };

    const clientId = input.entityType === "Client" ? input.entityId : undefined;

    const row = await prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        clientId: clientId ?? null,
        patientPathwayId: null,
        actorUserId: input.actorUserId ?? null,
        type,
        payload,
      },
      select: { id: true },
    });
    return row;
  }

  async findMany(filters: FindAuditEventsFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
    const skip = (page - 1) * limit;

    const typeFilter = filters.eventType ? parseAuditEventType(filters.eventType) : undefined;

    return prisma.auditEvent.findMany({
      where: {
        tenantId: filters.tenantId,
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    });
  }
}

export const auditEventPrismaRepository = new AuditEventPrismaRepository();
