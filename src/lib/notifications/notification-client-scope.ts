import type { Notification, Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import {
  filterNotificationsByClientScope,
  loadTenantMembershipClientScope,
  type TenantMembershipClientScope,
} from "@/lib/auth/client-visibility";
import type { Session } from "next-auth";

function isUnrestrictedNotificationScope(scope: TenantMembershipClientScope): boolean {
  return scope.role === "tenant_admin" || (!scope.restrictedToAssignedOnly && !scope.linkedOpmeSupplierId);
}

async function loadScope(session: Session, tenantId: string): Promise<TenantMembershipClientScope> {
  return loadTenantMembershipClientScope(session.user.id, tenantId, session.user.globalRole);
}

const CHUNK = 200;

type NotificationScopeBatchRow = {
  id: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

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

  const baseWhere = {
    userId,
    tenantId,
    ...(unreadOnly ? { readAt: null } : {}),
  } as const;

  if (isUnrestrictedNotificationScope(scope)) {
    const cursorCreatedAt = cursor
      ? (
          await prisma.notification.findFirst({
            where: { id: cursor, userId, tenantId },
            select: { createdAt: true },
          })
        )?.createdAt
      : undefined;

    if (cursor && cursorCreatedAt === undefined) {
      return { rows: [], nextCursor: null };
    }

    const rows = await prisma.notification.findMany({
      where: {
        ...baseWhere,
        ...(cursorCreatedAt ? { createdAt: { lt: cursorCreatedAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.id : null;
    return { rows: page, nextCursor };
  }

  let beforeCreatedAt: Date | null = null;
  if (cursor) {
    const cur = await prisma.notification.findFirst({
      where: { id: cursor, userId, tenantId },
      select: { createdAt: true },
    });
    beforeCreatedAt = cur?.createdAt ?? null;
    if (!cur) {
      return { rows: [], nextCursor: null };
    }
  }

  const page: Notification[] = [];
  let fetchBefore = beforeCreatedAt;

  while (page.length < limit + 1) {
    const batch = await prisma.notification.findMany({
      where: {
        ...baseWhere,
        ...(fetchBefore ? { createdAt: { lt: fetchBefore } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: CHUNK,
    });

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
    return prisma.notification.count({
      where: { userId, tenantId, readAt: null },
    });
  }

  let total = 0;
  let fetchBefore: Date | null = null;

  for (;;) {
    const batch: NotificationScopeBatchRow[] = await prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        readAt: null,
        ...(fetchBefore ? { createdAt: { lt: fetchBefore } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: CHUNK,
      select: { id: true, metadata: true, createdAt: true },
    });

    if (batch.length === 0) break;

    fetchBefore = batch[batch.length - 1]!.createdAt;

    const filtered = await filterNotificationsByClientScope(batch, tenantId, scope, userId);
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
    const result = await prisma.notification.updateMany({
      where: { userId, tenantId, readAt: null },
      data: { readAt: now },
    });
    return result.count;
  }

  let total = 0;
  let fetchBefore: Date | null = null;

  for (;;) {
    const batch: NotificationScopeBatchRow[] = await prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        readAt: null,
        ...(fetchBefore ? { createdAt: { lt: fetchBefore } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: CHUNK,
      select: { id: true, metadata: true, createdAt: true },
    });

    if (batch.length === 0) break;

    fetchBefore = batch[batch.length - 1]!.createdAt;

    const filtered = await filterNotificationsByClientScope(batch, tenantId, scope, userId);
    if (filtered.length > 0) {
      const result = await prisma.notification.updateMany({
        where: { id: { in: filtered.map((f) => f.id) }, userId, tenantId },
        data: { readAt: now },
      });
      total += result.count;
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
