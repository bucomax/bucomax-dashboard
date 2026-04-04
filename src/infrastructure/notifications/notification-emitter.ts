import type { NotificationType, Prisma } from "@prisma/client";
import type { EmitNotificationInput, INotificationEmitter } from "@/application/ports/notification-emitter.port";
import type { NotificationJobPayload } from "@/infrastructure/queue/notification-job-types";
import { prisma } from "@/infrastructure/database/prisma";
import { isRedisEnabled, tripRedisCircuit } from "@/infrastructure/queue/redis-connection";
import {
  filterUserIdsWhoCanViewClient,
  getClientIdFromPlainMetadata,
} from "@/lib/auth/client-visibility";

const TYPE_TO_TENANT_FLAG: Record<NotificationType, keyof Pick<
  Prisma.TenantSelect,
  "notifyCriticalAlerts" | "notifyNewPatients"
> | null> = {
  sla_critical: "notifyCriticalAlerts",
  sla_warning: "notifyCriticalAlerts",
  stage_transition: null,
  new_patient: "notifyNewPatients",
  checklist_complete: null,
};

async function isTenantFlagEnabled(tenantId: string, flag: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      notifyCriticalAlerts: true,
      notifyNewPatients: true,
    },
  });
  if (!tenant) return false;
  return (tenant as Record<string, unknown>)[flag] !== false;
}

async function resolveUserIds(input: EmitNotificationInput): Promise<string[]> {
  if (input.targetUserIds && input.targetUserIds.length > 0) {
    return input.targetUserIds;
  }
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: input.tenantId },
    select: { userId: true },
  });
  return memberships.map((m) => m.userId);
}

/** Inline mode: write directly to Postgres (no fila, no pub/sub). Used on Vercel / without Redis. */
async function emitInline(input: EmitNotificationInput, userIds: string[]): Promise<void> {
  const metadataJson = input.metadata
    ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue)
    : undefined;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      tenantId: input.tenantId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      metadata: metadataJson,
    })),
  });
}

/** Queue mode: publish job to BullMQ → worker persists + pub/sub SSE. */
async function emitViaQueue(input: EmitNotificationInput, userIds: string[]): Promise<void> {
  const { getNotificationQueue } = await import("@/infrastructure/queue/notification-queue");

  const payload: NotificationJobPayload = {
    tenantId: input.tenantId,
    type: input.type,
    title: input.title,
    body: input.body,
    metadata: input.metadata,
    userIds,
  };

  const deduplicationKey = input.correlationId ?? Date.now().toString();
  const rawJobId = `${input.tenantId}|${input.type}|${deduplicationKey}`;
  const jobId = rawJobId.replace(/:/g, "_");

  await getNotificationQueue().add("emit", payload, { jobId });
}

export const notificationEmitter: INotificationEmitter = {
  async emit(input: EmitNotificationInput): Promise<void> {
    const flagField = TYPE_TO_TENANT_FLAG[input.type];

    if (flagField && !input.ignoreTenantNotificationPreference) {
      const enabled = await isTenantFlagEnabled(input.tenantId, flagField);
      if (!enabled) return;
    }

    let userIds = await resolveUserIds(input);
    if (userIds.length === 0) return;

    const scopedClientId = getClientIdFromPlainMetadata(input.metadata);
    if (scopedClientId && !input.skipClientVisibilityFilter) {
      userIds = await filterUserIdsWhoCanViewClient(input.tenantId, scopedClientId, userIds);
    }
    if (userIds.length === 0) return;

    if (isRedisEnabled()) {
      try {
        await emitViaQueue(input, userIds);
      } catch (e) {
        console.warn("[notifications] Fila Redis indisponível; gravando notificações inline.", e);
        tripRedisCircuit();
        await emitInline(input, userIds);
      }
    } else {
      await emitInline(input, userIds);
    }
  },
};
