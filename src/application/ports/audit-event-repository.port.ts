export type RecordAuditEventInput = {
  tenantId: string;
  actorUserId?: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type FindAuditEventsFilters = {
  tenantId: string;
  clientId?: string;
  eventType?: string;
  page?: number;
  limit?: number;
};

/** Mesmo contrato de `recordAuditEvent(prisma, …)` — persistência fora de transação. */
export type RecordAuditEventCanonicalInput = {
  tenantId: string;
  clientId?: string | null;
  patientPathwayId?: string | null;
  actorUserId?: string | null;
  eventType: string;
  payload: unknown;
};

export interface IAuditEventRepository {
  record(input: RecordAuditEventInput): Promise<{ id: string }>;
  /** Substitui `recordAuditEvent(prisma, …)` fora de `$transaction`. */
  recordCanonical(input: RecordAuditEventCanonicalInput): Promise<void>;
  findMany(filters: FindAuditEventsFilters): Promise<unknown[]>;
}
