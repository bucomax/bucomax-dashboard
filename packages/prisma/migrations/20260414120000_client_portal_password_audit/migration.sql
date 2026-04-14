-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'PATIENT_PORTAL_PASSWORD_SET';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "portalPasswordHash" TEXT;
