ALTER TABLE "Tenant"
ADD COLUMN     "notifyCriticalAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifySurgeryReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewPatients" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyWeeklyReport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyDocumentDelivery" BOOLEAN NOT NULL DEFAULT true;
