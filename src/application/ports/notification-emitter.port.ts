import type { NotificationType } from "@prisma/client";

export type EmitNotificationInput = {
  tenantId: string;
  type: NotificationType;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  /** When empty, notifies all members of the tenant. */
  targetUserIds?: string[];
  /** Deterministic key for BullMQ jobId deduplication (e.g. patientPathwayId, transitionId). */
  correlationId?: string;
  /**
   * Quando true, ignora preferências do tenant (`notifyNewPatients`, etc.) para este envio.
   * Usar só em eventos críticos explícitos (ex.: auto-cadastro pelo link/QR).
   */
  ignoreTenantNotificationPreference?: boolean;
};

export interface INotificationEmitter {
  emit(input: EmitNotificationInput): Promise<void>;
}
