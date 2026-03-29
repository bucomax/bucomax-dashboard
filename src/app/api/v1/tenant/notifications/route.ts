import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  assertTenantAdminOrSuper,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { patchTenantNotificationsBodySchema } from "@/lib/validators/tenant-notifications";

export const dynamic = "force-dynamic";

function toTenantNotificationsDto(tenant: {
  notifyCriticalAlerts: boolean;
  notifySurgeryReminders: boolean;
  notifyNewPatients: boolean;
  notifyWeeklyReport: boolean;
  notifyDocumentDelivery: boolean;
}) {
  return {
    notifyCriticalAlerts: tenant.notifyCriticalAlerts,
    notifySurgeryReminders: tenant.notifySurgeryReminders,
    notifyNewPatients: tenant.notifyNewPatients,
    notifyWeeklyReport: tenant.notifyWeeklyReport,
    notifyDocumentDelivery: tenant.notifyDocumentDelivery,
  };
}

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantCtx.tenantId },
    select: {
      notifyCriticalAlerts: true,
      notifySurgeryReminders: true,
      notifyNewPatients: true,
      notifyWeeklyReport: true,
      notifyDocumentDelivery: true,
    },
  });

  if (!tenant) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  return jsonSuccess({
    notifications: toTenantNotificationsDto(tenant),
  });
}

export async function PATCH(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const adminBlock = await assertTenantAdminOrSuper(auth.session!, tenantCtx.tenantId, request, apiT);
  if (adminBlock) return adminBlock;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patchTenantNotificationsBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantCtx.tenantId },
    data: parsed.data,
    select: {
      notifyCriticalAlerts: true,
      notifySurgeryReminders: true,
      notifyNewPatients: true,
      notifyWeeklyReport: true,
      notifyDocumentDelivery: true,
    },
  });

  return jsonSuccess({
    notifications: toTenantNotificationsDto(tenant),
  });
}
