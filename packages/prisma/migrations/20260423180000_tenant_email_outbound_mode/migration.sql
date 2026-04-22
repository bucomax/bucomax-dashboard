-- CreateEnum
CREATE TYPE "EmailOutboundMode" AS ENUM ('platform', 'smtp', 'resend_domain');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "emailOutboundMode" "EmailOutboundMode" NOT NULL DEFAULT 'platform';

-- Backfill: prefer SMTP completo, senão domínio verificado, senão platform
UPDATE "Tenant" t
SET "emailOutboundMode" = 'smtp'
WHERE t."smtpEnabled" = true
  AND t."smtpHost" IS NOT NULL
  AND trim(t."smtpHost") <> ''
  AND t."smtpUser" IS NOT NULL
  AND trim(t."smtpUser") <> ''
  AND t."smtpPasswordEnc" IS NOT NULL
  AND t."smtpFromAddress" IS NOT NULL
  AND trim(t."smtpFromAddress") <> '';

UPDATE "Tenant" t
SET "emailOutboundMode" = 'resend_domain'
WHERE t."emailOutboundMode" = 'platform'
  AND t."emailEnabled" = true
  AND lower(coalesce(t."emailDomainStatus", '')) = 'verified'
  AND t."emailFromAddress" IS NOT NULL
  AND trim(t."emailFromAddress") <> '';
