import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { assertNotificationVisibleToClientScope } from "@/application/use-cases/notification/list-notifications-with-scope";
import { runMarkNotificationRead } from "@/application/use-cases/notification/mark-notification-read";
import { notificationPrismaRepository } from "@/infrastructure/repositories/notification.repository";

export const dynamic = "force-dynamic";

import type { RouteCtx } from "@/types/api/route-context";

export async function PATCH(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { notificationId } = await ctx.params;
  const userId = auth.session!.user.id;

  const row = await notificationPrismaRepository.findById(tenantCtx.tenantId, notificationId);
  if (!row || typeof row !== "object") {
    return jsonError("NOT_FOUND", apiT("errors.notificationNotFound"), 404);
  }
  const notification = row as { userId: string };
  if (notification.userId !== userId) {
    return jsonError("NOT_FOUND", apiT("errors.notificationNotFound"), 404);
  }

  const visible = await assertNotificationVisibleToClientScope(
    auth.session!,
    tenantCtx.tenantId,
    userId,
    row,
  );
  if (!visible) {
    return jsonError("NOT_FOUND", apiT("errors.notificationNotFound"), 404);
  }

  const result = await runMarkNotificationRead({
    tenantId: tenantCtx.tenantId,
    userId,
    notificationId,
  });
  if (!result.ok) {
    return jsonError("NOT_FOUND", apiT("errors.notificationNotFound"), 404);
  }

  return jsonSuccess({ notification: result.notification });
}
