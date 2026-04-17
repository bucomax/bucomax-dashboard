import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";
import { patchTenantNotificationsBodySchema } from "@/lib/validators/tenant-notifications";
import type { z } from "zod";

export function toTenantNotificationsDto(tenant: {
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

export async function getTenantNotificationSettings(tenantId: string) {
  return tenantPrismaRepository.findTenantNotificationPrefsById(tenantId);
}

export type PatchTenantNotificationsInput = z.infer<typeof patchTenantNotificationsBodySchema>;

export async function patchTenantNotificationSettings(params: {
  tenantId: string;
  data: PatchTenantNotificationsInput;
}) {
  return tenantPrismaRepository.updateTenantNotificationPrefs(params.tenantId, params.data);
}
