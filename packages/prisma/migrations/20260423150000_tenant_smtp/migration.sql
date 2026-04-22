-- AlterTable: SMTP do tenant (opção alternativa ao domínio verificado)
ALTER TABLE "Tenant" ADD COLUMN "smtpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "smtpHost" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "smtpPort" INTEGER DEFAULT 587;
ALTER TABLE "Tenant" ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "smtpUser" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "smtpPasswordEnc" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "smtpFromName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "smtpFromAddress" TEXT;
