import type {
  INotificationRepository,
  NotificationListFilters,
  NotificationScopeBatchRow,
} from "@/application/ports/notification-repository.port";
import { prisma } from "@/infrastructure/database/prisma";

export class NotificationPrismaRepository implements INotificationRepository {
  async findById(tenantId: string, notificationId: string) {
    return prisma.notification.findFirst({
      where: { id: notificationId, tenantId },
    });
  }

  async findMany(filters: NotificationListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    return prisma.notification.findMany({
      where: {
        tenantId: filters.tenantId,
        userId: filters.userId,
        ...(filters.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    });
  }

  async markRead(tenantId: string, notificationId: string, userId: string) {
    const row = await prisma.notification.updateMany({
      where: { id: notificationId, tenantId, userId },
      data: { readAt: new Date() },
    });
    return row.count > 0;
  }

  async markReadIdempotent(tenantId: string, notificationId: string, userId: string) {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
    if (!existing) return null;
    return prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: existing.readAt ?? new Date() },
    });
  }

  async markAllRead(tenantId: string, userId: string) {
    const row = await prisma.notification.updateMany({
      where: { tenantId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return row.count;
  }

  async countUnread(tenantId: string, userId: string) {
    return prisma.notification.count({
      where: { tenantId, userId, readAt: null },
    });
  }

  async findCreatedAtForCursor(tenantId: string, userId: string, notificationId: string) {
    const row = await prisma.notification.findFirst({
      where: { id: notificationId, userId, tenantId },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  }

  async findManyPaginatedBeforeCreatedAt(params: {
    tenantId: string;
    userId: string;
    unreadOnly: boolean;
    beforeCreatedAt?: Date | null;
    take: number;
  }) {
    const { tenantId, userId, unreadOnly, beforeCreatedAt, take } = params;
    return prisma.notification.findMany({
      where: {
        tenantId,
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
        ...(beforeCreatedAt ? { createdAt: { lt: beforeCreatedAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async findManyUnreadLightBatch(params: {
    tenantId: string;
    userId: string;
    beforeCreatedAt?: Date | null;
    take: number;
  }): Promise<NotificationScopeBatchRow[]> {
    const { tenantId, userId, beforeCreatedAt, take } = params;
    return prisma.notification.findMany({
      where: {
        tenantId,
        userId,
        readAt: null,
        ...(beforeCreatedAt ? { createdAt: { lt: beforeCreatedAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, metadata: true, createdAt: true },
    });
  }

  async updateReadAtByIds(tenantId: string, userId: string, ids: string[], readAt: Date) {
    if (ids.length === 0) {
      return 0;
    }
    const result = await prisma.notification.updateMany({
      where: { id: { in: ids }, userId, tenantId },
      data: { readAt },
    });
    return result.count;
  }
}

export const notificationPrismaRepository = new NotificationPrismaRepository();
