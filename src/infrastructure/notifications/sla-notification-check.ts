import type { NotificationType } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { resolvePathwayNotificationTargetUserIds } from "@/lib/notifications/resolve-pathway-notification-targets";
import { notificationEmitter } from "./notification-emitter";
import { computeSlaHealthStatus } from "@/lib/pathway/sla-health";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

type SlaCheckInput = {
  tenantId: string;
  pathwayId: string;
  versionId: string;
};

/**
 * Checks all patients in a pathway version for SLA warning/critical status
 * and emits deduplicated notifications (max once per 24h per patient+stage+type).
 */
export async function checkAndEmitSlaNotifications(input: SlaCheckInput): Promise<void> {
  const now = new Date();

  const patients = await prisma.patientPathway.findMany({
    where: {
      tenantId: input.tenantId,
      pathwayId: input.pathwayId,
      pathwayVersionId: input.versionId,
    },
    select: {
      id: true,
      clientId: true,
      enteredStageAt: true,
      currentStageId: true,
      currentStageAssigneeUserId: true,
      client: { select: { name: true } },
      currentStage: {
        select: {
          id: true,
          name: true,
          alertWarningDays: true,
          alertCriticalDays: true,
        },
      },
    },
  });

  for (const pp of patients) {
    const status = computeSlaHealthStatus(
      pp.enteredStageAt,
      now,
      pp.currentStage.alertWarningDays,
      pp.currentStage.alertCriticalDays,
    );

    if (status !== "warning" && status !== "danger") continue;

    const notifType: NotificationType = status === "danger" ? "sla_critical" : "sla_warning";
    const daysInStage = Math.floor((now.getTime() - pp.enteredStageAt.getTime()) / MS_PER_DAY);

    const cutoff = new Date(now.getTime() - DEDUP_WINDOW_MS);
    const existing = await prisma.notification.findFirst({
      where: {
        tenantId: input.tenantId,
        type: notifType,
        createdAt: { gte: cutoff },
        metadata: {
          path: ["patientPathwayId"],
          equals: pp.id,
        },
      },
      select: { id: true },
    });

    if (existing) continue;

    const targetUserIds = await resolvePathwayNotificationTargetUserIds({
      tenantId: input.tenantId,
      type: notifType,
      currentStageAssigneeUserId: pp.currentStageAssigneeUserId,
    });

    const label = status === "danger" ? "Alerta crítico" : "Atenção";
    notificationEmitter.emit({
      tenantId: input.tenantId,
      type: notifType,
      title: `${label}: ${pp.client.name}`,
      body: `${daysInStage} dias na etapa "${pp.currentStage.name}".`,
      targetUserIds,
      correlationId: `${pp.id}:${pp.currentStage.id}`,
      metadata: {
        clientId: pp.clientId,
        patientPathwayId: pp.id,
        stageId: pp.currentStage.id,
        stageName: pp.currentStage.name,
        daysInStage,
      },
    }).catch((err) => console.error("[notification] sla emit failed:", err));
  }
}
