import type { NotificationType } from "@prisma/client";
import { notificationPrismaRepository } from "@/infrastructure/repositories/notification.repository";
import type { NotificationDto } from "@/types/api/notification-v1";

export type MarkNotificationReadResult =
  | { ok: true; notification: NotificationDto }
  | { ok: false; code: "NOT_FOUND" };

/**
 * Marca notificação como lida (mantém `readAt` se já estava definido).
 */
export async function runMarkNotificationRead(params: {
  tenantId: string;
  userId: string;
  notificationId: string;
}): Promise<MarkNotificationReadResult> {
  const { tenantId, userId, notificationId } = params;

  const updated = await notificationPrismaRepository.markReadIdempotent(
    tenantId,
    notificationId,
    userId,
  );
  if (!updated || typeof updated !== "object") {
    return { ok: false, code: "NOT_FOUND" };
  }
  const u = updated as {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata: unknown;
    readAt: Date | null;
    createdAt: Date;
  };

  const dto: NotificationDto = {
    id: u.id,
    type: u.type,
    title: u.title,
    body: u.body,
    metadata: u.metadata as Record<string, unknown> | null,
    readAt: u.readAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };

  return { ok: true, notification: dto };
}
