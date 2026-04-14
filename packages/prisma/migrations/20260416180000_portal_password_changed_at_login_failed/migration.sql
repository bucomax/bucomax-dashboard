-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'PATIENT_PORTAL_LOGIN_FAILED';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "portalPasswordChangedAt" TIMESTAMP(3);
