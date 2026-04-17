import { z } from "zod";

import { AuditEventType } from "@prisma/client";
import { revalidateTenantClientsList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { auditEventPrismaRepository } from "@/infrastructure/repositories/audit-event.repository";
import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";
import { mapPrismaClientRowToClientDto } from "@/application/use-cases/client/serialize-client-list";
import { postClientBodySchema } from "@/lib/validators/client";
import type { ClientDto } from "@/types/api/clients-v1";

export type CreateClientBody = z.infer<typeof postClientBodySchema>;

export { postClientBodySchema };

/**
 * Cria paciente (`Client`), revalida lista, auditoria `PATIENT_CREATED`.
 */
export async function runCreateClient(params: {
  tenantId: string;
  actorUserId: string;
  data: CreateClientBody;
}): Promise<{ client: ClientDto }> {
  const { tenantId, actorUserId, data: d } = params;

  const row = await clientPrismaRepository.createClientStaff({
    tenantId,
    name: d.name,
    phone: d.phone,
    email: d.email,
    caseDescription: d.caseDescription,
    documentId: d.documentId,
    postalCode: d.postalCode,
    addressLine: d.addressLine,
    addressNumber: d.addressNumber,
    addressComp: d.addressComp,
    neighborhood: d.neighborhood,
    city: d.city,
    state: d.state,
    isMinor: d.isMinor,
    birthDate: d.birthDate,
    guardianName: d.guardianName,
    guardianDocumentId: d.guardianDocumentId,
    guardianPhone: d.guardianPhone,
    guardianEmail: d.guardianEmail,
    guardianRelationship: d.guardianRelationship,
    emergencyContactName: d.emergencyContactName,
    emergencyContactPhone: d.emergencyContactPhone,
    preferredChannel: d.preferredChannel,
    assignedToUserId: d.assignedToUserId,
    opmeSupplierId: d.opmeSupplierId,
  });

  revalidateTenantClientsList(tenantId);

  await auditEventPrismaRepository.recordCanonical({
    tenantId,
    clientId: (row as { id: string }).id,
    patientPathwayId: null,
    actorUserId,
    eventType: AuditEventType.PATIENT_CREATED,
    payload: { clientId: (row as { id: string }).id },
  });

  return { client: mapPrismaClientRowToClientDto(row as Parameters<typeof mapPrismaClientRowToClientDto>[0]) };
}
