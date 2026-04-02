-- CreateEnum
CREATE TYPE "PatientPortalFileReviewStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'PATIENT_PORTAL_FILE_SUBMITTED';
ALTER TYPE "AuditEventType" ADD VALUE 'PATIENT_PORTAL_FILE_APPROVED';
ALTER TYPE "AuditEventType" ADD VALUE 'PATIENT_PORTAL_FILE_REJECTED';

-- DropForeignKey
ALTER TABLE "FileAsset" DROP CONSTRAINT "FileAsset_uploadedById_fkey";

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN "patientPortalReviewStatus" "PatientPortalFileReviewStatus" NOT NULL DEFAULT 'NOT_APPLICABLE';

ALTER TABLE "FileAsset" ALTER COLUMN "uploadedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "FileAsset_tenantId_clientId_patientPortalReviewStatus_idx" ON "FileAsset"("tenantId", "clientId", "patientPortalReviewStatus");
