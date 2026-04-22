-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'patient_portal_link_sent';

-- AlterEnum
ALTER TYPE "DispatchChannel" ADD VALUE 'EMAIL';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN     "emailFromName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN     "emailFromAddress" TEXT;
ALTER TABLE "Tenant" ADD COLUMN     "emailResendDomainId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN     "emailDomainName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN     "emailDomainStatus" TEXT;
ALTER TABLE "Tenant" ADD COLUMN     "emailDomainDnsRecords" JSONB;
ALTER TABLE "Tenant" ADD COLUMN     "emailDomainVerifiedAt" TIMESTAMP(3);
