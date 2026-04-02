import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { assertNotificationVisibleToClientScope } from "@/lib/notifications/notification-client-scope";
import type { NotificationDto } from "@/types/api/notification-v1";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ notificationId: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { notificationId } = await ctx.params;
  const userId = auth.session!.user.id;

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, tenantId: tenantCtx.tenantId },
  });
  if (!notification) {
    return jsonError("NOT_FOUND", apiT("errors.notificationNotFound"), 404);
  }

  const visible = await assertNotificationVisibleToClientScope(
    auth.session!,
    tenantCtx.tenantId,
    userId,
    notification,
  );
  if (!visible) {
    return jsonError("NOT_FOUND", apiT("errors.notificationNotFound"), 404);
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: notification.readAt ?? new Date() },
  });

  const dto: NotificationDto = {
    id: updated.id,
    type: updated.type,
    title: updated.title,
    body: updated.body,
    metadata: updated.metadata as Record<string, unknown> | null,
    readAt: updated.readAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };

  return jsonSuccess({ notification: dto });
}
