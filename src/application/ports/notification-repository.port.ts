export type NotificationListFilters = {
  tenantId: string;
  userId: string;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
};

export type NotificationScopeBatchRow = {
  id: string;
  metadata: unknown;
  createdAt: Date;
};

export interface INotificationRepository {
  findById(tenantId: string, notificationId: string): Promise<unknown | null>;
  findMany(filters: NotificationListFilters): Promise<unknown[]>;
  markRead(tenantId: string, notificationId: string, userId: string): Promise<boolean>;
  /** Idempotente: se já tinha `readAt`, mantém o valor. */
  markReadIdempotent(tenantId: string, notificationId: string, userId: string): Promise<unknown | null>;
  markAllRead(tenantId: string, userId: string): Promise<number>;
  countUnread(tenantId: string, userId: string): Promise<number>;

  findCreatedAtForCursor(
    tenantId: string,
    userId: string,
    notificationId: string,
  ): Promise<Date | null>;

  findManyPaginatedBeforeCreatedAt(params: {
    tenantId: string;
    userId: string;
    unreadOnly: boolean;
    beforeCreatedAt?: Date | null;
    take: number;
  }): Promise<unknown[]>;

  findManyUnreadLightBatch(params: {
    tenantId: string;
    userId: string;
    beforeCreatedAt?: Date | null;
    take: number;
  }): Promise<NotificationScopeBatchRow[]>;

  updateReadAtByIds(
    tenantId: string,
    userId: string,
    ids: string[],
    readAt: Date,
  ): Promise<number>;
}
