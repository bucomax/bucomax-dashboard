import { z } from "zod";

export const patchTenantNotificationsBodySchema = z
  .object({
    notifyCriticalAlerts: z.boolean().optional(),
    notifySurgeryReminders: z.boolean().optional(),
    notifyNewPatients: z.boolean().optional(),
    notifyWeeklyReport: z.boolean().optional(),
    notifyDocumentDelivery: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos uma preferência para atualizar.",
  });
