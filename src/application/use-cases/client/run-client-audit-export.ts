import { AuditEventType } from "@prisma/client";
import { buildClientAuditExportCsv } from "@/application/use-cases/client/export-client-audit-csv";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { clientAuditExportPrismaRepository } from "@/infrastructure/repositories/client-audit-export.repository";
import type { ClientTimelineEventCategory } from "@/types/api/clients-v1";

export async function runClientAuditExport(params: {
  tenantId: string;
  clientId: string;
  actorUserId: string;
  from: Date;
  to: Date;
  categoryFilter: Set<ClientTimelineEventCategory> | null;
}) {
  const { tenantId, clientId, actorUserId, from, to, categoryFilter } = params;

  const sources = await clientAuditExportPrismaRepository.fetchSourcesForCsv(
    tenantId,
    clientId,
    from,
    to,
  );

  const { csv, rowCount } = await buildClientAuditExportCsv(sources, {
    from,
    to,
    categoryFilter,
  });

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId,
    patientPathwayId: null,
    actorUserId,
    eventType: AuditEventType.AUDIT_EXPORT_GENERATED,
    payload: {
      format: "csv",
      rowCount,
      from: from.toISOString(),
      to: to.toISOString(),
    },
  });

  return { csv, rowCount };
}
