import type { Notification, Prisma } from "@prisma/client";
import type { Session } from "next-auth";

import type { NotificationScopeBatchRow } from "@/application/ports/notification-repository.port";
import {
  filterNotificationsByClientScope,
  loadTenantMembershipClientScope,
  type TenantMembershipClientScope,
} from "@/application/use-cases/shared/load-client-visibility-scope";
import { notificationPrismaRepository } from "@/infrastructure/repositories/notification.repository";

function isUnrestrictedNotificationScope(scope: TenantMembershipClientScope): boolean {
  return scope.role === "tenant_admin" || (!scope.restrictedToAssignedOnly && !scope.linkedOpmeSupplierId);
}

async function loadScope(session: Session, tenantId: string): Promise<TenantMembershipClientScope> {
  return loadTenantMembershipClientScope(session.user.id, tenantId, session.user.globalRole);
}

const CHUNK = 200;

/** Lista notificações com paginação por cursor, aplicando escopo de paciente quando necessário. */
export async function listNotificationsWithClientScope(params: {
  session: Session;
  tenantId: string;
  userId: string;
  limit: number;
  cursor: string | undefined;
  unreadOnly: boolean;
}): Promise<{ rows: Notification[]; nextCursor: string | null }> {
  const { session, tenantId, userId, limit, cursor, unreadOnly } = params;
  const scope = await loadScope(session, tenantId);

  if (isUnrestrictedNotificationScope(scope)) {
    const cursorCreatedAt = cursor
      ? await notificationPrismaRepository.findCreatedAtForCursor(tenantId, userId, cursor)
      : undefined;

    if (cursor && cursorCreatedAt === null) {
      return { rows: [], nextCursor: null };
    }

    const rows = (await notificationPrismaRepository.findManyPaginatedBeforeCreatedAt({
      tenantId,
      userId,
      unreadOnly,
      beforeCreatedAt: cursorCreatedAt ?? undefined,
      take: limit + 1,
    })) as Notification[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.id : null;
    return { rows: page, nextCursor };
  }

  let beforeCreatedAt: Date | null = null;
  if (cursor) {
    const curCreatedAt = await notificationPrismaRepository.findCreatedAtForCursor(
      tenantId,
      userId,
      cursor,
    );
    if (curCreatedAt === null) {
      return { rows: [], nextCursor: null };
    }
    beforeCreatedAt = curCreatedAt;
  }

  const page: Notification[] = [];
  let fetchBefore = beforeCreatedAt;

  while (page.length < limit + 1) {
    const batch = (await notificationPrismaRepository.findManyPaginatedBeforeCreatedAt({
      tenantId,
      userId,
      unreadOnly,
      beforeCreatedAt: fetchBefore ?? undefined,
      take: CHUNK,
    })) as Notification[];

    if (batch.length === 0) break;

    fetchBefore = batch[batch.length - 1]!.createdAt;

    const filtered = await filterNotificationsByClientScope(
      batch.map((n) => ({ id: n.id, metadata: n.metadata })),
      tenantId,
      scope,
      userId,
    );
    const allowed = new Set(filtered.map((f) => f.id));

    for (const n of batch) {
      if (!allowed.has(n.id)) continue;
      page.push(n);
      if (page.length >= limit + 1) break;
    }

    if (batch.length < CHUNK) break;
  }

  const hasMore = page.length > limit;
  const slice = hasMore ? page.slice(0, limit) : page;
  const nextCursor = hasMore ? slice[slice.length - 1]!.id : null;
  return { rows: slice, nextCursor };
}

export async function countUnreadNotificationsWithClientScope(
  session: Session,
  tenantId: string,
  userId: string,
): Promise<number> {
  const scope = await loadScope(session, tenantId);

  if (isUnrestrictedNotificationScope(scope)) {
    return notificationPrismaRepository.countUnread(tenantId, userId);
  }

  let total = 0;
  let fetchBefore: Date | null = null;

  for (;;) {
    const batch: NotificationScopeBatchRow[] = await notificationPrismaRepository.findManyUnreadLightBatch({
      tenantId,
      userId,
      beforeCreatedAt: fetchBefore ?? undefined,
      take: CHUNK,
    });

    if (batch.length === 0) break;

    fetchBefore = batch[batch.length - 1]!.createdAt;

    const filtered = await filterNotificationsByClientScope(
      batch.map((b) => ({
        id: b.id,
        metadata: b.metadata as Prisma.JsonValue | null,
      })),
      tenantId,
      scope,
      userId,
    );
    total += filtered.length;

    if (batch.length < CHUNK) break;
  }

  return total;
}

export async function markAllUnreadNotificationsReadWithClientScope(
  session: Session,
  tenantId: string,
  userId: string,
): Promise<number> {
  const scope = await loadScope(session, tenantId);
  const now = new Date();

  if (isUnrestrictedNotificationScope(scope)) {
    return notificationPrismaRepository.markAllRead(tenantId, userId);
  }

  let total = 0;
  let fetchBefore: Date | null = null;

  for (;;) {
    const batch: NotificationScopeBatchRow[] = await notificationPrismaRepository.findManyUnreadLightBatch({
      tenantId,
      userId,
      beforeCreatedAt: fetchBefore ?? undefined,
      take: CHUNK,
    });

    if (batch.length === 0) break;

    fetchBefore = batch[batch.length - 1]!.createdAt;

    const filtered = await filterNotificationsByClientScope(
      batch.map((b) => ({
        id: b.id,
        metadata: b.metadata as Prisma.JsonValue | null,
      })),
      tenantId,
      scope,
      userId,
    );
    if (filtered.length > 0) {
      const count = await notificationPrismaRepository.updateReadAtByIds(
        tenantId,
        userId,
        filtered.map((f) => f.id),
        now,
      );
      total += count;
    }

    if (batch.length < CHUNK) break;
  }

  return total;
}

export async function assertNotificationVisibleToClientScope(
  session: Session,
  tenantId: string,
  userId: string,
  notification: Pick<Notification, "id" | "metadata">,
): Promise<boolean> {
  const scope = await loadScope(session, tenantId);
  if (isUnrestrictedNotificationScope(scope)) return true;
  const filtered = await filterNotificationsByClientScope(
    [{ id: notification.id, metadata: notification.metadata }],
    tenantId,
    scope,
    userId,
  );
  return filtered.length > 0;
}

/**
 * SSE / payloads sem sessão completa: aplica a mesma regra de `metadata.clientId` que a API REST.
 * Objetos aninhados são aceitos como `Prisma.JsonValue` após round-trip seguro.
 */
export async function isNotificationMetadataVisibleToViewer(params: {
  userId: string;
  globalRole: string;
  tenantId: string;
  metadata: unknown;
}): Promise<boolean> {
  const metadata =
    params.metadata === undefined || params.metadata === null
      ? null
      : (JSON.parse(JSON.stringify(params.metadata)) as Prisma.JsonValue);

  const scope = await loadTenantMembershipClientScope(
    params.userId,
    params.tenantId,
    params.globalRole,
  );
  if (isUnrestrictedNotificationScope(scope)) return true;

  const filtered = await filterNotificationsByClientScope(
    [{ id: "sse", metadata }],
    params.tenantId,
    scope,
    params.userId,
  );
  return filtered.length > 0;
}
